import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BookmarkIcon, BriefcaseIcon, PhoneIcon, TrophyIcon,
  XCircleIcon, ExternalLinkIcon, Trash2Icon, ChevronDownIcon,
  MapPinIcon, TrendingUpIcon, StickyNoteIcon,
} from 'lucide-react'

const COLUMNS = [
  {
    id: 'saved',
    label: 'Saved',
    icon: BookmarkIcon,
    color: 'text-slate-300',
    border: 'border-slate-600',
    bg: 'bg-slate-800/30',
    dot: 'bg-slate-400',
  },
  {
    id: 'applied',
    label: 'Applied',
    icon: BriefcaseIcon,
    color: 'text-blue-300',
    border: 'border-blue-700/50',
    bg: 'bg-blue-900/10',
    dot: 'bg-blue-400',
  },
  {
    id: 'interviewing',
    label: 'Interviewing',
    icon: PhoneIcon,
    color: 'text-amber-300',
    border: 'border-amber-700/50',
    bg: 'bg-amber-900/10',
    dot: 'bg-amber-400',
  },
  {
    id: 'offer',
    label: 'Offer 🎉',
    icon: TrophyIcon,
    color: 'text-green-300',
    border: 'border-green-700/50',
    bg: 'bg-green-900/10',
    dot: 'bg-green-400',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    icon: XCircleIcon,
    color: 'text-red-300',
    border: 'border-red-700/50',
    bg: 'bg-red-900/10',
    dot: 'bg-red-400',
  },
]

const STATUS_NEXT = {
  saved: 'applied',
  applied: 'interviewing',
  interviewing: 'offer',
  offer: null,
  rejected: null,
}

function TrackerCard({ job, onStatusChange, onRemove }) {
  const [showMenu, setShowMenu] = useState(false)
  const pct = Math.round((job.match_score || 0) * 100)

  const openJob = () => {
    if (window.electronAPI) window.electronAPI.openExternal(job.url)
    else window.open(job.url, '_blank')
  }

  const nextStatus = STATUS_NEXT[job.status]

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 hover:border-slate-600 transition-all group">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-100 leading-snug line-clamp-2">{job.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{job.company}</p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-slate-600 hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronDownIcon size={12} />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1 fade-in">
              <button
                onClick={() => { openJob(); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 text-left"
              >
                <ExternalLinkIcon size={10} /> Open listing
              </button>
              {COLUMNS.filter(c => c.id !== job.status).map(col => (
                <button
                  key={col.id}
                  onClick={() => { onStatusChange(job.id, col.id); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 text-left"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                  Move to {col.label}
                </button>
              ))}
              <hr className="border-slate-700 my-1" />
              <button
                onClick={() => { onRemove(job.id); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-700 text-left"
              >
                <Trash2Icon size={10} /> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Location + match */}
      <div className="flex items-center gap-2 mb-2">
        {job.location && (
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <MapPinIcon size={9} /> {job.location}
          </span>
        )}
        {pct > 0 && (
          <span className={`flex items-center gap-1 text-[10px] ml-auto ${
            pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-slate-500'
          }`}>
            <TrendingUpIcon size={9} /> {pct}%
          </span>
        )}
      </div>

      {/* Notes preview */}
      {job.notes && (
        <div className="flex items-start gap-1.5 mb-2 p-2 rounded-lg bg-slate-700/30">
          <StickyNoteIcon size={10} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{job.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-slate-600 uppercase tracking-wider">{job.source}</span>
        {nextStatus && (
          <button
            onClick={() => onStatusChange(job.id, nextStatus)}
            className="text-[10px] text-brand-400 hover:text-brand-300 font-medium transition-colors"
          >
            → {COLUMNS.find(c => c.id === nextStatus)?.label}
          </button>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ col, jobs, onStatusChange, onRemove }) {
  const Icon = col.icon
  return (
    <div className={`flex flex-col rounded-2xl border ${col.border} ${col.bg} min-h-48`} style={{ minWidth: 220, flex: 1 }}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
        <Icon size={13} className={col.color} />
        <p className={`text-xs font-semibold ${col.color}`}>{col.label}</p>
        <span className="ml-auto text-[10px] text-slate-500 font-medium bg-slate-700/50 px-2 py-0.5 rounded-full">
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        {jobs.length === 0 && (
          <div className="flex items-center justify-center h-20 text-slate-600 text-[10px]">
            No jobs yet
          </div>
        )}
        {jobs.map(job => (
          <TrackerCard
            key={job.id}
            job={job}
            onStatusChange={onStatusChange}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

export default function TrackerView() {
  const { trackerJobs, updateTrackerStatus, removeFromTracker, setView } = useApp()

  const jobsByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = trackerJobs.filter(j => (j.status || 'saved') === col.id)
    return acc
  }, {})

  const stats = {
    total: trackerJobs.length,
    applied: jobsByStatus.applied.length + jobsByStatus.interviewing.length + jobsByStatus.offer.length,
    interviewing: jobsByStatus.interviewing.length,
    offers: jobsByStatus.offer.length,
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-6 pt-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Application Tracker</h1>
        <p className="text-slate-400 text-sm">Track every job from interest to offer.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Saved',    value: stats.total,        color: 'text-slate-200' },
          { label: 'In Pipeline',    value: stats.applied,      color: 'text-blue-300' },
          { label: 'Interviewing',   value: stats.interviewing,  color: 'text-amber-300' },
          { label: 'Offers',         value: stats.offers,        color: 'text-green-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      {trackerJobs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <BookmarkIcon size={40} className="text-slate-700" />
          <div>
            <p className="text-slate-300 font-medium mb-1">No saved jobs yet</p>
            <p className="text-slate-500 text-sm">Click the bookmark icon on any job card to track it here.</p>
          </div>
          <button className="btn-primary mt-2" onClick={() => setView('search')}>
            Search Jobs
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full pb-4" style={{ minWidth: COLUMNS.length * 240 }}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                jobs={jobsByStatus[col.id]}
                onStatusChange={updateTrackerStatus}
                onRemove={removeFromTracker}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
