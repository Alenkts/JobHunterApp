const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (opts) => ipcRenderer.invoke('save-file-dialog', opts),
  saveBinaryFile: (opts) => ipcRenderer.invoke('save-binary-file', opts),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  checkBackend: () => ipcRenderer.invoke('check-backend'),
  onBackendStatus: (cb) => ipcRenderer.on('backend-status', (_, data) => cb(data)),
  isElectron: true,
})
