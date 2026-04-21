import React from 'react'
import { AppProvider } from './context/AppContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Home from './components/Home.jsx'
import SearchView from './components/SearchView.jsx'
import Settings from './components/Settings.jsx'
import TrackerView from './components/TrackerView.jsx'
import { useApp } from './context/AppContext.jsx'

function AppShell() {
  const { view } = useApp()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* macOS traffic-light drag region */}
      <div className="drag-bar" />

      <Sidebar />

      <main className="flex-1 overflow-hidden">
        {view === 'home'     && <Home />}
        {view === 'search'   && <SearchView />}
        {view === 'tracker'  && <TrackerView />}
        {view === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  )
}
