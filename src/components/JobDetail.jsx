import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  BrainIcon, DownloadIcon, ExternalLinkIcon, XIcon,
  BookOpenIcon, CheckCircleIcon, AlertCircleIcon,
  FileTextIcon, ChevronDownIcon, ChevronUpIcon,
} from 'lucide-react'

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

export default function JobDetail() {
  const {
    selectedJob, setSelectedJob,
    tailoredData, tailoringLoading,
    downloadResume,
  } = useApp()

  const [tab, setTab] = useState('resume')  // 'resume' | 'topics' | 'jd'
  const [resumeExpanded, setResumeExpanded] = useState(false)

  // Auto-switch to topics tab when tailoring finishes and topics are ready
  useEffect(() => {
    if (!tailoringLoading && tailoredData?.topics?.length > 0 && tab === 'resume') {
      // Only auto-switch if user hasn't manually picked a tab yet
    }
  }, [tailoringLoading, tailoredData])

  if (!selectedJob) return null

  const openApply = () => {
    if (window.electronAPI) window.electronAPI.openExternal(selectedJob.url)
    else window.open(selectedJob.url, '_blank')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 pt-12 flex items-start justify-between gap-3">
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

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-5">
        {[
          { id: 'resume', label: 'Tailored Resume', icon: FileTextIcon },
          { id: 'topics', label: 'Study Topics',    icon: BookOpenIcon },
          { id: 'jd',     label: 'Job Description', icon: AlertCircleIcon },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
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
        {tailoringLoading ? (
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
          </>
        )}
      </div>
    </div>
  )
}
