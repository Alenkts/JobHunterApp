import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BriefcaseIcon, MapPinIcon, ClockIcon, ExternalLinkIcon,
  TrendingUpIcon, BookmarkIcon, BookmarkCheckIcon,
} from 'lucide-react'

function MatchBadge({ score }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'text-green-400 bg-green-900/30 border-green-700/40'
              : pct >= 60 ? 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40'
              : 'text-slate-400 bg-slate-800 border-slate-700'
  return (
    <span className={`badge border ${color}`}>
      <TrendingUpIcon size={10} />
      {pct}% match
    </span>
  )
}

function SiteBadge({ site }) {
  const map = {
    linkedin:  { label: 'LinkedIn',  cls: 'bg-blue-900/30 text-blue-400 border-blue-700/40' },
    naukri:    { label: 'Naukri',    cls: 'bg-orange-900/30 text-orange-400 border-orange-700/40' },
    indeed:    { label: 'Indeed',    cls: 'bg-violet-900/30 text-violet-400 border-violet-700/40' },
    glassdoor: { label: 'Glassdoor', cls: 'bg-green-900/30 text-green-400 border-green-700/40' },
    remoteok:  { label: 'RemoteOK',  cls: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/40' },
    monster:   { label: 'Monster',   cls: 'bg-red-900/30 text-red-400 border-red-700/40' },
  }
  const { label, cls } = map[site] || { label: site, cls: 'bg-slate-800 text-slate-400 border-slate-700' }
  return <span className={`badge border ${cls} text-[10px]`}>{label}</span>
}

export default function JobList() {
  const {
    jobs, jobsLoading, selectedJob, setSelectedJob, tailorResume, searchQuery,
    saveJobToTracker, isJobSaved,
  } = useApp()

  if (jobsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full spinner" />
        <p className="text-slate-400 text-sm">Searching across job boards…</p>
        <p className="text-slate-600 text-xs">This may take a moment</p>
      </div>
    )
  }

  if (!jobs.length && !jobsLoading && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BriefcaseIcon size={32} className="text-slate-700" />
        <p className="text-slate-400">No jobs found</p>
        <p className="text-slate-600 text-sm">Try different keywords or locations</p>
      </div>
    )
  }

  if (!jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BriefcaseIcon size={32} className="text-slate-700" />
        <p className="text-slate-400">Search for jobs above</p>
        <p className="text-slate-600 text-xs">Results will appear here</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-slate-500 px-1">{jobs.length} jobs found</p>
      {jobs.map((job) => {
        const saved = isJobSaved(job.id)
        return (
          <div
            key={job.id}
            onClick={() => { setSelectedJob(job); tailorResume(job) }}
            className={`job-card fade-in ${selectedJob?.id === job.id ? 'selected' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{job.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{job.company}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <MatchBadge score={job.match_score || 0} />
                <button
                  onClick={(e) => { e.stopPropagation(); saveJobToTracker(job) }}
                  title={saved ? 'Saved to tracker' : 'Save to tracker'}
                  className={`p-1.5 rounded-lg transition-all ${
                    saved
                      ? 'text-brand-400 bg-brand-900/30 border border-brand-700/40'
                      : 'text-slate-600 hover:text-brand-400 hover:bg-slate-800'
                  }`}
                >
                  {saved
                    ? <BookmarkCheckIcon size={13} />
                    : <BookmarkIcon size={13} />
                  }
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1">
                <MapPinIcon size={11} /> {job.location || 'Remote'}
              </span>
              {job.posted_at && (
                <span className="flex items-center gap-1">
                  <ClockIcon size={11} /> {job.posted_at}
                </span>
              )}
            </div>

            {job.salary && (
              <p className="text-xs text-green-400 mb-2">💰 {job.salary}</p>
            )}

            <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
              {job.description?.slice(0, 160)}…
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <SiteBadge site={job.source} />
                {(job.tags || []).slice(0, 3).map((t) => (
                  <span key={t} className="badge bg-slate-800 text-slate-400 border border-slate-700">{t}</span>
                ))}
              </div>
              <a
                href={job.url}
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.electronAPI) { e.preventDefault(); window.electronAPI.openExternal(job.url) }
                }}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost py-1 text-xs"
              >
                <ExternalLinkIcon size={11} /> Apply
              </a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
