import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = 'http://localhost:8000'
const AppContext = createContext(null)

// Default settings shape — used as fallback only
const DEFAULT_SETTINGS = {
  claudeApiKey: '',
  linkedinApiKey: '',
  scrapeMethod: 'scraping',
  jobSites: ['linkedin', 'naukri', 'indeed', 'remoteok'],
  maxResults: 20,
}

export function AppProvider({ children }) {
  // ── Resume state ─────────────────────────────────────────────────────────────
  const [resume, setResume] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)

  // ── Job search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])   // from resume analysis
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)

  // ── Tailoring state ──────────────────────────────────────────────────────────
  const [tailoredData, setTailoredData] = useState(null)
  const [tailoringLoading, setTailoringLoading] = useState(false)

  // ── Tracker state ─────────────────────────────────────────────────────────────
  const [trackerJobs, setTrackerJobs] = useState([])

  // Load tracker on mount (best-effort)
  useEffect(() => {
    axios.get(`${API}/api/tracker`)
      .then(({ data }) => setTrackerJobs(data.jobs || []))
      .catch(() => {})
  }, [])

  const saveJobToTracker = useCallback(async (job) => {
    try {
      const { data } = await axios.post(`${API}/api/tracker/save`, { job })
      setTrackerJobs(prev => {
        const exists = prev.find(j => j.id === data.id)
        if (exists) return prev
        return [...prev, data]
      })
      toast.success('Job saved to tracker')
      return data
    } catch {
      toast.error('Failed to save job')
      return null
    }
  }, [])

  const updateTrackerStatus = useCallback(async (jobId, status, notes) => {
    try {
      const { data } = await axios.put(`${API}/api/tracker/${jobId}/status`, { status, notes })
      setTrackerJobs(prev => prev.map(j => j.id === jobId ? data : j))
      toast.success(`Status → ${status}`)
      return data
    } catch {
      toast.error('Failed to update status')
      return null
    }
  }, [])

  const updateTrackerNotes = useCallback(async (jobId, notes) => {
    try {
      const { data } = await axios.put(`${API}/api/tracker/${jobId}/notes`, { notes })
      setTrackerJobs(prev => prev.map(j => j.id === jobId ? data : j))
      return data
    } catch {
      toast.error('Failed to save notes')
      return null
    }
  }, [])

  const removeFromTracker = useCallback(async (jobId) => {
    try {
      await axios.delete(`${API}/api/tracker/${jobId}`)
      setTrackerJobs(prev => prev.filter(j => j.id !== jobId))
      toast.success('Removed from tracker')
    } catch {
      toast.error('Failed to remove')
    }
  }, [])

  const isJobSaved = useCallback((jobId) => {
    return trackerJobs.some(j => j.id === jobId)
  }, [trackerJobs])

  const getTrackerJob = useCallback((jobId) => {
    return trackerJobs.find(j => j.id === jobId) || null
  }, [trackerJobs])

  // ── Settings — loaded from backend on mount ──────────────────────────────────
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const settingsLoaded = useRef(false)

  // Load persisted settings from backend once it's up
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10

    const tryLoad = async () => {
      if (settingsLoaded.current) return
      try {
        const { data } = await axios.get(`${API}/api/settings`, { timeout: 2000 })
        if (data) {
          // Merge loaded settings with defaults (handles new keys added in updates)
          setSettings(prev => ({ ...DEFAULT_SETTINGS, ...data }))
          settingsLoaded.current = true
        }
      } catch {
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(tryLoad, 1500)  // retry until backend is ready
        }
      }
    }
    tryLoad()
  }, [])

  // ── Active view ──────────────────────────────────────────────────────────────
  const [view, setView] = useState('home')

  // ── Helpers ──────────────────────────────────────────────────────────────────
  // Build resume-aware search suggestions from the analysis
  const buildSearchSuggestions = useCallback((analysis) => {
    if (!analysis) return []
    const suggestions = []

    // Suggested roles are the primary search terms
    if (analysis.suggested_roles?.length) {
      analysis.suggested_roles.slice(0, 4).forEach(role => {
        suggestions.push({ label: role, type: 'role' })
      })
    }
    // Top skills as secondary suggestions
    if (analysis.skills?.length) {
      analysis.skills.slice(0, 4).forEach(skill => {
        suggestions.push({ label: skill, type: 'skill' })
      })
    }
    return suggestions
  }, [])

  // ── API calls ─────────────────────────────────────────────────────────────────
  const uploadResume = useCallback(async (file) => {
    setResumeLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await axios.post(`${API}/api/resume/upload`, form)
      const resumeData = { name: file.name, ...data }
      setResume(resumeData)

      // Auto-populate search query from top suggested role
      if (data.analysis?.suggested_roles?.length) {
        setSearchQuery(data.analysis.suggested_roles[0])
      }
      // Build suggestion chips
      setSearchSuggestions(buildSearchSuggestions(data.analysis))

      toast.success('Resume uploaded & analyzed!')
      return data
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to upload resume')
      return null
    } finally {
      setResumeLoading(false)
    }
  }, [buildSearchSuggestions])

  const searchJobs = useCallback(async (query, location) => {
    if (!resume) { toast.error('Please upload your resume first'); return }
    const q = query ?? searchQuery
    const l = location ?? searchLocation
    if (!q?.trim()) { toast.error('Enter a job title or keyword to search'); return }

    setJobsLoading(true)
    setJobs([])
    setSelectedJob(null)
    setTailoredData(null)
    try {
      const { data } = await axios.post(`${API}/api/jobs/search`, {
        query: q.trim(),
        location: l.trim(),
        sites: settings.jobSites,
        method: settings.scrapeMethod,
        max_results: settings.maxResults,
        resume_text: resume.text,
        api_keys: { linkedin: settings.linkedinApiKey },
      })
      setJobs(data.jobs || [])
      if (data.jobs?.length) toast.success(`Found ${data.jobs.length} matching jobs`)
      else toast('No jobs found — try different keywords', { icon: '🔍' })
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Job search failed')
    } finally {
      setJobsLoading(false)
    }
  }, [resume, searchQuery, searchLocation, settings])

  const tailorResume = useCallback(async (job) => {
    if (!resume) return
    setTailoringLoading(true)
    setTailoredData(null)
    try {
      const { data } = await axios.post(`${API}/api/resume/tailor`, {
        resume_text: resume.text,
        job_title: job.title,
        job_description: job.description,
        company: job.company,
        claude_api_key: settings.claudeApiKey,  // always current from loaded settings
      })
      setTailoredData(data)
      toast.success('Tailored resume ready!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Tailoring failed')
    } finally {
      setTailoringLoading(false)
    }
  }, [resume, settings.claudeApiKey])

  const downloadResume = useCallback(async (format) => {
    if (!tailoredData || !resume) return
    try {
      const resp = await axios.post(
        `${API}/api/resume/export`,
        { resume_text: tailoredData.resume_text, format, filename: `tailored_${resume.name}` },
        { responseType: 'blob' }
      )
      const blob = new Blob([resp.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tailored_resume.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded as .${format.toUpperCase()}`)
    } catch {
      toast.error('Download failed')
    }
  }, [tailoredData, resume])

  const saveSettings = useCallback(async (newSettings) => {
    try {
      await axios.post(`${API}/api/settings`, newSettings)
      setSettings(newSettings)
      toast.success('Settings saved')
    } catch {
      setSettings(newSettings)
      toast.success('Settings saved locally (backend unreachable)')
    }
  }, [])

  return (
    <AppContext.Provider value={{
      resume, setResume, resumeLoading, uploadResume,
      searchQuery, setSearchQuery,
      searchLocation, setSearchLocation,
      searchSuggestions,
      jobs, setJobs, jobsLoading, searchJobs,
      selectedJob, setSelectedJob,
      tailoredData, tailoringLoading, tailorResume,
      downloadResume,
      settings, saveSettings,
      view, setView,
      // Tracker
      trackerJobs,
      saveJobToTracker,
      updateTrackerStatus,
      updateTrackerNotes,
      removeFromTracker,
      isJobSaved,
      getTrackerJob,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
