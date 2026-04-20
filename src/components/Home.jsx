import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useApp } from '../context/AppContext.jsx'
import {
  UploadCloudIcon, FileTextIcon, CheckCircleIcon,
  ArrowRightIcon, BrainIcon, BriefcaseIcon, StarIcon,
  SparklesIcon,
} from 'lucide-react'

export default function Home() {
  const { resume, resumeLoading, uploadResume, setView, searchQuery, searchJobs } = useApp()

  const onDrop = useCallback(async (files) => {
    if (files[0]) await uploadResume(files[0])
  }, [uploadResume])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  })

  return (
    <div className="h-full overflow-y-auto p-8 pt-12">
      <div className="max-w-3xl mx-auto fade-in">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">
            Welcome to <span className="text-brand-400">JobHunter AI</span>
          </h1>
          <p className="text-slate-400">
            Upload your resume, search jobs across LinkedIn, Naukri & more, and get
            AI-tailored applications in seconds.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: UploadCloudIcon, step: '1', title: 'Upload Resume', desc: 'PDF, DOCX or TXT' },
            { icon: BriefcaseIcon, step: '2', title: 'Search Jobs', desc: 'Across multiple sites' },
            { icon: BrainIcon, step: '3', title: 'Tailor & Apply', desc: 'AI-generated resume' },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="card flex flex-col items-center text-center gap-2 py-6">
              <div className="w-10 h-10 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-1">
                <Icon size={18} className="text-brand-400" />
              </div>
              <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Step {step}</span>
              <p className="text-sm font-semibold text-slate-100">{title}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`card border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center
            ${isDragActive ? 'border-brand-500 bg-brand-900/20' : 'border-slate-700 hover:border-brand-600 hover:bg-slate-800/40'}
            ${resumeLoading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps()} />
          {resumeLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full spinner" />
              <p className="text-slate-300 text-sm">Analyzing your resume with Claude AI…</p>
            </div>
          ) : resume ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircleIcon size={40} className="text-green-400" />
              <p className="text-green-300 font-semibold">{resume.name}</p>
              <p className="text-slate-400 text-sm">Resume uploaded. Drop a new file to replace.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <UploadCloudIcon size={40} className={isDragActive ? 'text-brand-400' : 'text-slate-500'} />
              <p className="text-slate-200 font-semibold">Drop your resume here</p>
              <p className="text-slate-500 text-sm">or click to browse · PDF, DOCX, TXT</p>
            </div>
          )}
        </div>

        {/* Resume analysis summary */}
        {resume?.analysis && (
          <div className="mt-6 card fade-in">
            <div className="flex items-center gap-2 mb-4">
              <BrainIcon size={16} className="text-brand-400" />
              <h3 className="section-title text-base">Resume Analysis</h3>
              <div className="ml-auto flex items-center gap-1">
                <StarIcon size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">{resume.analysis.score}/10</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="label">Skills Detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {(resume.analysis.skills || []).slice(0, 8).map((s) => (
                    <span key={s} className="badge bg-brand-900/50 text-brand-300 border border-brand-700/50">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="label">Experience Level</p>
                <p className="text-slate-200 text-sm">{resume.analysis.experience_level}</p>
                <p className="label mt-3">Suggested Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {(resume.analysis.suggested_roles || []).slice(0, 4).map((r) => (
                    <span key={r} className="badge bg-slate-700 text-slate-300">{r}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-slate-800/50 rounded-xl px-4 py-3 leading-relaxed">
              {resume.analysis.summary}
            </p>
          </div>
        )}

        {/* CTA */}
        {resume && (
          <div className="mt-6 flex items-center justify-between fade-in">
            {resume.analysis?.suggested_roles?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <SparklesIcon size={12} className="text-brand-400" />
                <p className="text-xs text-slate-500">Quick search:</p>
                {resume.analysis.suggested_roles.slice(0, 3).map((role) => (
                  <button
                    key={role}
                    onClick={() => { setView('search'); setTimeout(() => searchJobs(role, ''), 150) }}
                    className="badge bg-brand-900/40 text-brand-300 border border-brand-700/50 hover:bg-brand-800/50 transition-all cursor-pointer text-xs px-3 py-1"
                  >
                    🎯 {role}
                  </button>
                ))}
              </div>
            )}
            <button
              className="btn-primary text-base px-6 py-3 ml-auto"
              onClick={() => setView('search')}
            >
              Search Jobs <ArrowRightIcon size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
