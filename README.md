# JobHunter AI

An Electron desktop app that reviews your resume, searches LinkedIn, Naukri, Indeed & more, and generates AI-tailored resumes and interview prep topics using Claude AI.

---

## Features

**Stage 1 — Job Discovery**
- Upload your resume (PDF, DOCX, TXT) and get an AI-powered analysis
- Search jobs across LinkedIn, Naukri, Indeed, and Glassdoor simultaneously
- AI match scoring shows how well each job fits your profile
- 3 fetch strategies: Web Scraping, Official APIs, or Playwright Browser Automation

**Stage 2 — AI Tailoring**
- Select any job to instantly generate a tailored resume via Claude AI
- Download as PDF or DOCX
- Get a prioritized list of topics to study before your interview
- Direct "Apply Now" link to the original job posting

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- An [Anthropic API key](https://console.anthropic.com) (free tier available)

### Setup

```bash
# Clone / open the project folder, then:
chmod +x setup.sh
./setup.sh

# Start the app
npm start
```

### Manual Start (two terminals)
```bash
# Terminal 1 — Python backend
npm run backend

# Terminal 2 — Electron + React frontend
npm run dev
```

---

## Configuration

Open **Settings** in the sidebar:

| Setting | Description |
|---|---|
| **Claude API Key** | Required for AI resume analysis & tailoring. Get one free at console.anthropic.com |
| **Job Fetch Method** | Choose between Scraping, Official APIs, or Browser Automation |
| **LinkedIn API Key** | Optional — only needed if using the "Official APIs" method |
| **Max Results** | Number of jobs to fetch per site (5–50) |

---

## Job Fetch Methods

### Web Scraping (Default)
Uses HTTP requests + BeautifulSoup. No credentials needed. Works immediately but may be rate-limited by job sites.

### Official APIs
Uses each site's official developer API. Most reliable and structured. LinkedIn requires an approved Developer App.

### Browser Automation
Uses Playwright (headless Chromium) to navigate job sites like a human. Most robust but slower. Requires:
```bash
python3 -m playwright install chromium
```

> ⚠️ **LinkedIn Note:** LinkedIn actively blocks automated access. If scraping fails, use the Browser method or Official API with valid credentials.

---

## Project Structure

```
JobHunterApp/
├── electron/               # Electron main process + preload
│   ├── main.js
│   └── preload.js
├── src/                    # React frontend
│   ├── components/
│   │   ├── Home.jsx        # Resume upload + analysis
│   │   ├── SearchView.jsx  # Job search UI
│   │   ├── JobList.jsx     # Job cards list
│   │   ├── JobDetail.jsx   # Tailored resume + topics
│   │   └── Settings.jsx    # App configuration
│   └── context/
│       └── AppContext.jsx  # Global state + API calls
├── backend/                # Python FastAPI
│   ├── main.py             # API routes
│   ├── ai_service.py       # Claude AI integration
│   ├── resume_parser.py    # PDF/DOCX parsing
│   ├── resume_generator.py # PDF/DOCX generation
│   └── scrapers/           # Job site scrapers
│       ├── linkedin_scraper.py
│       ├── naukri_scraper.py
│       ├── indeed_scraper.py
│       └── orchestrator.py
└── setup.sh                # One-time setup script
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 29 |
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python 3 + FastAPI + Uvicorn |
| AI | Anthropic Claude (claude-opus-4-6) |
| Scraping | Requests + BeautifulSoup + Playwright |
| Resume gen | ReportLab (PDF) + python-docx (DOCX) |
