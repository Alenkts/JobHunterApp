import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import {
  SaveIcon, KeyIcon, GlobeIcon, SlidersIcon,
  EyeIcon, EyeOffIcon, InfoIcon, CheckCircleIcon,
} from 'lucide-react'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} className="text-brand-400" />
        <h3 className="section-title text-base">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function ApiKeyField({ label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false)
  const isSet = value && value.length > 8
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="label mb-0">{label}</label>
        {isSet && (
          <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
            <CheckCircleIcon size={11} /> Saved
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          onClick={() => setShow(!show)}
          type="button"
        >
          {show ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
        </button>
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  )
}

const METHODS = [
  {
    id: 'scraping',
    label: 'Web Scraping',
    desc: 'Uses HTTP requests + BeautifulSoup. No credentials needed. May be rate-limited.',
    pros: ['No API keys', 'Works immediately', 'Broad coverage'],
    cons: ['May be blocked', 'Subject to layout changes'],
  },
  {
    id: 'api',
    label: 'Official APIs',
    desc: 'Uses official job board APIs where available. Most reliable but requires API keys.',
    pros: ['Most reliable', 'Structured data', 'Rate limit aware'],
    cons: ['API keys required', 'Limited to approved apps'],
  },
  {
    id: 'browser',
    label: 'Browser Automation',
    desc: 'Uses Playwright headless browser. Slowest but most robust to layout changes.',
    pros: ['Handles JS-rendered pages', 'Most human-like', 'Works on all sites'],
    cons: ['Slower', 'Requires Playwright install', 'Higher resource use'],
  },
]

export default function Settings() {
  const { settings, saveSettings } = useApp()
  const [local, setLocal] = useState({ ...settings })
  const [saving, setSaving] = useState(false)

  // Keep local form in sync whenever the global settings are loaded/updated
  // (e.g. when the backend loads persisted settings after app start)
  useEffect(() => {
    setLocal({ ...settings })
  }, [settings])

  const set = (key, val) => setLocal((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    await saveSettings(local)
    setSaving(false)
  }

  return (
    <div className="h-full overflow-y-auto p-8 pt-12">
      <div className="max-w-2xl mx-auto fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100 mb-1">Settings</h1>
          <p className="text-slate-400 text-sm">Configure API keys, job sources, and scraping method.</p>
        </div>

        {/* AI Keys */}
        <Section title="AI Configuration" icon={KeyIcon}>
          <ApiKeyField
            label="Anthropic Claude API Key"
            value={local.claudeApiKey}
            onChange={(v) => set('claudeApiKey', v)}
            placeholder="sk-ant-…"
            hint="Required for resume tailoring and analysis. Get it at console.anthropic.com"
          />
        </Section>

        {/* Scraping method */}
        <Section title="Job Fetch Method" icon={SlidersIcon}>
          <div className="space-y-3">
            {METHODS.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  local.scrapeMethod === m.id
                    ? 'border-brand-500 bg-brand-900/20'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  className="mt-1 accent-brand-500"
                  checked={local.scrapeMethod === m.id}
                  onChange={() => set('scrapeMethod', m.id)}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">{m.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{m.desc}</p>
                  <div className="flex gap-4 mt-2">
                    <div>
                      {m.pros.map((p) => (
                        <p key={p} className="text-[10px] text-green-400">✓ {p}</p>
                      ))}
                    </div>
                    <div>
                      {m.cons.map((c) => (
                        <p key={c} className="text-[10px] text-red-400">✗ {c}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {local.scrapeMethod === 'api' && (
            <div className="mt-4 space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <p className="text-xs font-semibold text-slate-300">API Keys for Job Sites</p>
              <ApiKeyField
                label="LinkedIn API Key (optional)"
                value={local.linkedinApiKey || ''}
                onChange={(v) => set('linkedinApiKey', v)}
                placeholder="Your LinkedIn app client ID/secret"
                hint="Create a LinkedIn app at linkedin.com/developers"
              />
            </div>
          )}
        </Section>

        {/* Search settings */}
        <Section title="Search Settings" icon={GlobeIcon}>
          <div>
            <label className="label">Max Results per Site</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5" max="50" step="5"
                value={local.maxResults}
                onChange={(e) => set('maxResults', Number(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="text-sm font-bold text-brand-400 w-8 text-center">{local.maxResults}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Higher values take longer but return more results</p>
          </div>
        </Section>

        {/* Info box */}
        <div className="flex gap-3 p-4 rounded-xl border border-blue-800/40 bg-blue-900/10 mb-6">
          <InfoIcon size={15} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-relaxed">
            <strong>Note on LinkedIn scraping:</strong> LinkedIn actively restricts automated access.
            Web scraping may be blocked or return limited results. For best results with LinkedIn,
            use the API method with valid credentials, or use the Browser Automation method which
            mimics human browsing behavior.
          </p>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button className="btn-primary px-6 py-2.5" onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner" />
            ) : (
              <SaveIcon size={15} />
            )}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
