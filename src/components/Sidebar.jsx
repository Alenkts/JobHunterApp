import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BriefcaseIcon, HomeIcon, SearchIcon, SettingsIcon,
  FileTextIcon, ZapIcon, ServerIcon,
} from 'lucide-react'

const NAV = [
  { id: 'home',     label: 'Home',     icon: HomeIcon },
  { id: 'search',   label: 'Jobs',     icon: SearchIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar() {
  const { view, setView, resume, jobs } = useApp()
  const [backendOk, setBackendOk] = useState(null) // null=checking, true=ok, false=down

  useEffect(() => {
    const check = async () => {
      try {
        if (window.electronAPI?.checkBackend) {
          const ok = await window.electronAPI.checkBackend()
          setBackendOk(ok)
        } else {
          // Browser mode: try fetch
          const r = await fetch('http://localhost:8000/health')
          setBackendOk(r.ok)
        }
      } catch {
        setBackendOk(false)
      }
    }
    check()
    const id = setInterval(check, 5000)
    // Listen for backend crash events
    window.electronAPI?.onBackendStatus?.((d) => setBackendOk(d.running))
    return () => clearInterval(id)
  }, [])

  return (
    <aside className="w-56 flex flex-col bg-slate-900/50 border-r border-slate-800 pt-10 pb-4 px-3 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <ZapIcon size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 leading-none">JobHunter</p>
          <p className="text-[10px] text-brand-400 mt-0.5">AI Powered</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              view === id
                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6 border-t border-slate-800 pt-4">
        <p className="text-[10px] text-slate-500 px-3 uppercase tracking-wider mb-3">Status</p>

        {/* Resume status */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <FileTextIcon size={14} className={resume ? 'text-green-400' : 'text-slate-600'} />
          <div>
            <p className="text-xs text-slate-300">Resume</p>
            <p className={`text-[10px] ${resume ? 'text-green-400' : 'text-slate-500'}`}>
              {resume ? resume.name.slice(0, 18) + (resume.name.length > 18 ? '…' : '') : 'Not uploaded'}
            </p>
          </div>
        </div>

        {/* Jobs found */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <BriefcaseIcon size={14} className={jobs.length ? 'text-brand-400' : 'text-slate-600'} />
          <div>
            <p className="text-xs text-slate-300">Jobs found</p>
            <p className={`text-[10px] ${jobs.length ? 'text-brand-400' : 'text-slate-500'}`}>
              {jobs.length ? `${jobs.length} results` : 'None yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Backend status */}
      <div className="mt-auto px-3 space-y-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
          backendOk === true  ? 'border-green-800/40 bg-green-900/10' :
          backendOk === false ? 'border-red-800/40 bg-red-900/10' :
          'border-slate-800 bg-slate-900/20'
        }`}>
          <ServerIcon size={12} className={
            backendOk === true  ? 'text-green-400' :
            backendOk === false ? 'text-red-400' :
            'text-slate-600'
          } />
          <div>
            <p className="text-[10px] font-medium text-slate-400">Backend</p>
            <p className={`text-[10px] ${
              backendOk === true  ? 'text-green-400' :
              backendOk === false ? 'text-red-400' :
              'text-slate-500'
            }`}>
              {backendOk === true ? 'Running' : backendOk === false ? 'Not running' : 'Checking…'}
            </p>
          </div>
          {backendOk === false && (
            <p className="text-[9px] text-red-400 ml-auto leading-tight">
              Run:<br/>pip install -r<br/>backend/requirements.txt
            </p>
          )}
        </div>
        <p className="text-[10px] text-slate-600 text-center">v1.0.0 · Built with Claude AI</p>
      </div>
    </aside>
  )
}
