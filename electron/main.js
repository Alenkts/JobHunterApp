const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const fs = require('fs')
const http = require('http')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow
let backendProcess

// ─── Find Python executable ──────────────────────────────────────────────────
function findPython() {
  // On macOS, Electron runs with a minimal PATH that often misses /usr/local/bin
  // Try candidates in priority order
  const candidates = [
    '/Library/Frameworks/Python.framework/Versions/3.14/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    '/usr/bin/python3',
    'python3',
    'python',
  ]
  for (const cmd of candidates) {
    try {
      execSync(`"${cmd}" --version`, { stdio: 'ignore' })
      console.log(`[Backend] Using Python: ${cmd}`)
      return cmd
    } catch (_) { /* not found */ }
  }
  return 'python3'  // last resort
}

// ─── Poll backend health until ready ────────────────────────────────────────
function waitForBackend(retries = 20, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      const req = http.get('http://127.0.0.1:8000/health', (res) => {
        if (res.statusCode === 200) {
          console.log('[Backend] Ready ✓')
          resolve()
        } else {
          retry()
        }
      })
      req.on('error', retry)
      req.setTimeout(400, () => { req.destroy(); retry() })
    }
    const retry = () => {
      attempts++
      if (attempts >= retries) {
        console.error('[Backend] Did not start in time — opening window anyway')
        resolve()   // still open the window; UI will show connection error
      } else {
        setTimeout(check, intervalMs)
      }
    }
    check()
  })
}

// ─── Start Python backend ────────────────────────────────────────────────────
function startBackend() {
  const backendDir = path.join(__dirname, '..', 'backend')
  const pythonCmd = findPython()

  console.log('[Backend] Starting FastAPI server…')
  backendProcess = spawn(pythonCmd, ['main.py'], {
    cwd: backendDir,
    env: {
      ...process.env,
      // Ensure common Python paths are in PATH
      PATH: [
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '/Library/Frameworks/Python.framework/Versions/3.14/bin',
        '/Library/Frameworks/Python.framework/Versions/3.13/bin',
        '/Library/Frameworks/Python.framework/Versions/3.12/bin',
        process.env.PATH || '',
      ].join(':'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  backendProcess.stdout.on('data', (d) => console.log('[Backend]', d.toString().trim()))
  backendProcess.stderr.on('data', (d) => console.error('[Backend]', d.toString().trim()))
  backendProcess.on('close', (code) => {
    console.log(`[Backend] exited with code ${code}`)
    // Notify frontend if window is open
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backend-status', { running: false })
    }
  })

  return waitForBackend()
}

// ─── Create main window ──────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── IPC: backend status ─────────────────────────────────────────────────────
ipcMain.handle('check-backend', async () => {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/health', (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(1000, () => { req.destroy(); resolve(false) })
  })
})

// ─── IPC: open file / save dialog ───────────────────────────────────────────
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Resume', extensions: ['pdf', 'docx', 'doc', 'txt'] }],
  })
  return canceled ? null : filePaths[0]
})

ipcMain.handle('save-file-dialog', async (_, { defaultName, ext }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  })
  return canceled ? null : filePath
})

ipcMain.handle('save-binary-file', async (_, { filePath, base64Data }) => {
  try {
    const buf = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, buf)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('open-external', async (_, url) => {
  await shell.openExternal(url)
})

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    const buf = fs.readFileSync(filePath)
    return { success: true, base64: buf.toString('base64'), name: path.basename(filePath) }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await startBackend()   // waits until /health responds or times out
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill()
})
