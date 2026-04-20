import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import JobList from './JobList.jsx'
import JobDetail from './JobDetail.jsx'
import {
  SearchIcon, MapPinIcon, FilterIcon, SparklesIcon,
  LinkedinIcon, BriefcaseIcon, GlobeIcon,
} from 'lucide-react'

const SITES = [
  { id: 'linkedin',  label: 'LinkedIn',   icon: LinkedinIcon,  color: 'text-blue-400' },
  { id: 'naukri',    label: 'Naukri',     icon: BriefcaseIcon, color: 'text-orange-400' },
  { id: 'indeed',    label: 'Indeed',     icon: GlobeIcon,     color: 'text-violet-400' },
  { id: 'glassdoor', label: 'Glassdoor',  icon: GlobeIcon,     color: 'text-green-400' },
  { id: 'remoteok',  label: 'RemoteOK ✓', icon: GlobeIcon,     color: 'text-emerald-400' },
]

export default function SearchView() {
  const {
    searchQuery, setSearchQuery,
    searchLocation, setSearchLocation,
    searchSuggestions,
    searchJobs, jobsLoading, jobs,
    resume,
    settings, saveSettings,
    selectedJob,
  } = useApp()

  const [localSites, setLocalSites] = useState(settings.jobSites)

  // Keep localSites in sync when settings load from backend
  useEffect(() => {
    setLocalSites(settings.jobSites)
  }, [settings.jobSites])

  const toggleSite = (id) => {
    const next = localSites.includes(id)
      ? localSites.filter((s) => s !== id)
      : [...localSites, id]
    setLocalSites(next)
    saveSettings({ ...settings, jobSites: next })
  }

  const handleSearch = (e) => {
    e.preventDefault()
    searchJobs(searchQuery, searchLocation)
  }

  const applySuggestion = (label) => {
    setSearchQuery(label)
    // Kick off search immediately with the suggestion
    searchJobs(label, searchLocation)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: search + list */}
      <div className={`flex flex-col overflow-hidden transition-all ${selectedJob ? 'w-[420px] shrink-0' : 'flex-1'}`}>

        {/* Search bar */}
        <div className="p-5 border-b border-slate-800 pt-12 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-9"
                placeholder="Job title, skills, keywords…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative">
              <MapPinIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input w-40 pl-9"
                placeholder="Location"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </div>
            <button
              className="btn-primary px-5"
              disabled={jobsLoading || !searchQuery.trim()}
            >
              {jobsLoading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />
                : <SearchIcon size={15} />
              }
              {jobsLoading ? 'Searching…' : 'Search'}
            </button>
          </form>

          {/* Resume-based search suggestions */}
          {searchSuggestions.length > 0 && jobs.length === 0 && !jobsLoading && (
            <div className="flex items-start gap-2">
              <SparklesIcon size={12} className="text-brand-400 mt-1 shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-500 mt-0.5">From your resume:</span>
                {searchSuggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => applySuggestion(s.label)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all hover:scale-105 active:scale-95 ${
                      s.type === 'role'
                        ? 'bg-brand-900/40 text-brand-300 border-brand-700/50 hover:bg-brand-800/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {s.type === 'role' ? '🎯 ' : ''}{s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Site filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterIcon size={12} className="text-slate-500" />
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Sites</p>
            {SITES.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => toggleSite(id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  localSites.includes(id)
                    ? 'bg-slate-700 border-slate-600 text-slate-100'
                    : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-700'
                }`}
              >
                <Icon size={11} className={localSites.includes(id) ? color : 'text-slate-600'} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto">
          <JobList />
        </div>
      </div>

      {/* Right: job detail */}
      {selectedJob && (
        <div className="flex-1 overflow-hidden border-l border-slate-800">
          <JobDetail />
        </div>
      )}
    </div>
  )
}
