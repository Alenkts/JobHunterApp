import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BrainIcon, DownloadIcon, ExternalLinkIcon, XIcon,
  BookOpenIcon, CheckCircleIcon, AlertCircleIcon,
  FileTextIcon, ChevronDownIcon, ChevronUpIcon,
  BookmarkIcon, BookmarkCheckIcon, StickyNoteIcon,
  CheckIcon,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'saved',        label: 'Saved',        color: 'text-slate-300 bg-slate-700 border-slate-600' },
  { value: 'applied',      label: 'Applied',      color: 'text-blue-300 bg-blue-900/40 border-blue-700/50' },
  { value: 'interviewing', label: 'Interviewing', color: 'text-amber-300 bg-amber-900/40 border-amber-700/50' },
  { value: 'offer',        label: 'Offer 🎉',     color: 'text-green-300 bg-green-900/40 border-green-700/50' },
  { value: 'rejected',     label: 'Rejected',     color: 'text-red-300 bg-red-900/40 border-red-700/50' },
]

function TopicCard({ topic }) {
  const [open, setOpen] = useState(false)
  const priorityColor = {
    high:   'border-red-500/40 bg-red-900/10',
    medium: 'border-yellow-500/40 bg-yellow-900/10',
    low:    'border-green-500/40 bg-green-900/10',
  }[topic.priority] || 'border-slate-700 bg-slate-800/50'

  return (
    <div className={`rounded-xl border p-3 ${priorityColor} cursor-pointer`} onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpenIcon size={13} className="text-slate-400 shrink-0" />
          <p className="text-sm font-medium text-slate-200">{topic.topic}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge text-[10px] border ${
            topic.priority === 'high' ? 'bg-red-900/40 text-red-400 border-red-700/40' :
            topic.priority === 'medium' ? 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40' :
            'bg-green-900/40 text-green-400 border-green-700/40'
          }`}>{topic.priority}</span>
          {open ? <ChevronUpIcon size={13} className="text-slate-500" /> : <ChevronDownIcon size={13} className="text-slate-500" />}
        </div>
      </div>
      {open && (
        <p className="text-xs text-slate-400 mt-2 leading-relaxed pl-5">{topic.reason}</p>
      )}
    </div>
  )
}

function StatusDropdown({ currentStatus, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[0]

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${current.color}`}
      >
        {current.label}
        <ChevronDownIcon size={11} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1 fade-in">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-slate-700 ${
                opt.value === currentStatus ? 'text-brand-300' : 'text-slate-300'
              }`}
            >
              {opt.value === currentStatus && <CheckIcon size={11} className="text-brand-400" />}
              <span className={opt.value === currentStatus ? 'ml-0' : 'ml-4'}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function JobDetail() {
  const {
    selectedJob, setSelectedJob,
    tailoredData, tailoringLoading,
    downloadResume,
    saveJobToTracker, updateTrackerStatus, updateTrackerNotes,
    isJobSaved, getTrackerJob,
  } = useApp()

  const [tab, setTab] = useState('resume')  // 'resume' | 'topics' | 'jd' | 'notes'
  const [resumeExpanded, setResumeExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const notesTimer = useRef(null)

  // Sync notes from tracker when job changes
  useEffect(() => {
    if (!selectedJob) return
    const tracked = getTrackerJob(selectedJob.id)
    setNotes(tracked?.notes || '')
  }, [selectedJob?.id, getTrackerJob])

  if (!selectedJob) return null

  const saved = isJobSaved(selectedJob.id)
  const trackerJob = getTrackerJob(selectedJob.id)

  const openApply = () => {
    if (window.electronAPI) window.electronAPI.openExternal(selectedJob.url)
    else window.open(selectedJob.url, '_blank')
  }

  const handleSaveToggle = async () => {
    if (!saved) {
      await saveJobToTracker(selectedJob)
    }
  }

  const handleStatusChange = async (status) => {
    if (!saved) {
      await saveJobToTracker(selectedJob)
    }
    await updateTrackerStatus(selectedJob.id, status)
  }

  const handleNotesChange = (val) => {
    setNotes(val)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(async () => {
      if (!saved) await saveJobToTracker(selectedJob)
      setNotesSaving(true)
      await updateTrackerNotes(selectedJob.id, val)
      setNotesSaving(false)
    }, 800)
  }

  const tabs = [
    { id: 'resume', label: 'Tailored Resume', icon: FileTextIcon },
    { id: 'topics', label: 'Study Topics',    icon: BookOpenIcon },
    { id: 'jd',     label: 'Job Description', icon: AlertCircleIcon },
    { id: 'notes',  label: 'Notes',           icon: StickyNoteIcon },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 pt-12">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 text-base truncate">{selectedJob.title}</p>
            <p className="text-sm text-slate-400 mt-0.5">{selectedJob.company} · {selectedJob.location}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="btn-primary text-xs px-3 py-2" onClick={openApply}>
              <ExternalLinkIcon size={13} /> Apply Now
            </button>
            <button className="btn-ghost p-2" onClick={() => setSelectedJob(null)}>
              <XIcon size={15} />
            </button>
          </div>
        </div>

        {/* Tracker bar: save + status */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              saved
                ? 'text-brand-300 bg-brand-900/30 border-brand-700/40'
                : 'text-slate-400 bg-slate-800 border-slate-700 hover:text-brand-300 hover:border-brand-700/40'
            }`}
          >
            {saved ? <BookmarkCheckIcon size={12} /> : <BookmarkIcon size={12} />}
            {saved ? 'Saved' : 'Save to Tracker'}
          </button>

          {saved && (
            <StatusDropdown
              currentStatus={trackerJob?.status || 'saved'}
              onSelect={handleStatusChange}
            />
          )}

          {selectedJob.salary && (
            <span className="ml-auto text-xs text-green-400 font-medium">💰 {selectedJob.salary}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={13} /> {label}
            {id === 'topics' && tailoredData?.topics?.length > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-brand-600 text-[9px] text-white flex items-center justify-center">
                {tailoredData.topics.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {tailoringLoading && tab !== 'notes' && tab !== 'jd' ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full spinner" />
            <div className="text-center">
              <p className="text-slate-300 text-sm">Tailoring your resume…</p>
              <p className="text-slate-500 text-xs mt-1">Claude AI is analyzing the job description</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── RESUME TAB ── */}
            {tab === 'resume' && (
              <div className="space-y-4 fade-in">
                {tailoredData ? (
                  <>
                    {/* Score */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                      <CheckCircleIcon size={18} className="text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-200">
                          Match Score: <span className="font-bold text-green-400">{tailoredData.match_score}%</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{tailoredData.match_reason}</p>
                      </div>
                    </div>

                    {/* Download buttons */}
                    <div className="flex gap-2">
                      <button className="btn-secondary flex-1 text-xs" onClick={() => downloadResume('pdf')}>
                        <DownloadIcon size={13} /> Download PDF
                      </button>
                      <button className="btn-secondary flex-1 text-xs" onClick={() => downloadResume('docx')}>
                        <DownloadIcon size={13} /> Download DOCX
                      </button>
                    </div>

                    {/* Resume preview */}
                    <div className="rounded-xl border border-slate-700 bg-slate-900/50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                        <div className="flex items-center gap-2">
                          <BrainIcon size={13} className="text-brand-400" />
                          <p className="text-xs font-semibold text-slate-300">AI-Tailored Resume Preview</p>
                        </div>
                        <button className="btn-ghost text-xs p-1" onClick={() => setResumeExpanded(!resumeExpanded)}>
                          {resumeExpanded ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />}
                        </button>
                      </div>
                      <div className={`overflow-hidden transition-all ${resumeExpanded ? 'max-h-none' : 'max-h-72'}`}>
                        <pre className="p-4 text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                          {tailoredData.resume_text}
                        </pre>
                      </div>
                    </div>

                    {/* Key changes */}
                    {tailoredData.key_changes?.length > 0 && (
                      <div>
                        <p className="label mb-2">Key Improvements Made</p>
                        <ul className="space-y-1.5">
                          {tailoredData.key_changes.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                              <CheckCircleIcon size={12} className="text-green-400 mt-0.5 shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <FileTextIcon size={32} className="text-slate-700" />
                    <p className="text-slate-500 text-sm text-center">Select a job to generate a tailored resume</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TOPICS TAB ── */}
            {tab === 'topics' && (
              <div className="space-y-3 fade-in">
                {tailoredData?.topics?.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-slate-500">
                        Before your interview at <span className="text-slate-200 font-medium">{selectedJob.company}</span>:
                      </p>
                      <span className="badge bg-brand-900/40 text-brand-300 border border-brand-700/40">
                        {tailoredData.topics.length} topics
                      </span>
                    </div>

                    {/* "Upgrade" nudge when no Claude key */}
                    {tailoredData.match_reason?.includes('Claude API') && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-900/10 border border-amber-700/30 mb-2">
                        <BrainIcon size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300 leading-relaxed">
                          These are keyword-gap topics. Add your <strong>Claude API key</strong> in
                          Settings for deeper, AI-personalised interview prep.
                        </p>
                      </div>
                    )}

                    {tailoredData.topics.map((t, i) => (
                      <TopicCard key={i} topic={t} />
                    ))}
                  </>
                ) : tailoringLoading ? null : (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <BookOpenIcon size={32} className="text-slate-700" />
                    <p className="text-slate-500 text-sm">Select a job to generate topics</p>
                  </div>
                )}
              </div>
            )}

            {/* ── JD TAB ── */}
            {tab === 'jd' && (
              <div className="fade-in">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500">Full job description from {selectedJob.company}</p>
                  <button className="btn-ghost text-xs" onClick={openApply}>
                    <ExternalLinkIcon size={11} /> Open original
                  </button>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-sm font-semibold text-slate-100 mb-1">{selectedJob.title}</p>
                  <p className="text-xs text-slate-400 mb-4">{selectedJob.company} · {selectedJob.location}</p>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedJob.description}
                  </p>
                </div>
              </div>
            )}

            {/* ── NOTES TAB ── */}
            {tab === 'notes' && (
              <div className="fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Your private notes for this job</p>
                  {notesSaving && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <div className="w-2 h-2 border border-slate-500 border-t-transparent rounded-full spinner" />
                      Saving…
                    </span>
                  )}
                  {!notesSaving && notes && (
                    <span className="text-[10px] text-green-500 flex items-center gap-1">
                      <CheckIcon size={10} /> Saved
                    </span>
                  )}
                </div>
                <textarea
                  className="w-full h-72 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-200
                    placeholder-slate-600 resize-none focus:outline-none focus:border-brand-600 transition-colors
                    leading-relaxed font-sans"
                  placeholder={`Notes for ${selectedJob.title} at ${selectedJob.company}…\n\nE.g. why you're excited, talking points, interview prep, follow-up tasks…`}
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  {['📅 Interview scheduled', '📞 Recruiter called', '✅ Application submitted', '🔄 Follow up needed'].map(chip => (
                    <button
                      key={chip}
                      onClick={() => handleNotesChange(notes ? `${notes}\n${chip}` : chip)}
                      className="badge bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 hover:border-slate-600 cursor-pointer transition-all text-xs px-2.5 py-1"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
