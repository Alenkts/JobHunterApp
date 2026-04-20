"""JobHunter AI — FastAPI backend."""
import asyncio
from typing import List, Optional, Literal
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from config import Settings, get_settings, save_settings
from resume_parser import parse_resume
from ai_service import analyze_resume, tailor_resume, generate_smart_topics
from resume_generator import generate_pdf, generate_docx
from scrapers import search_all_sites

app = FastAPI(title='JobHunter AI', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

# ─── Settings ────────────────────────────────────────────────────────────────

@app.get('/api/settings')
def get_settings_endpoint():
    return get_settings().model_dump()

@app.post('/api/settings')
def update_settings(settings: Settings):
    save_settings(settings)
    return {'ok': True}

# ─── Resume upload & analysis ────────────────────────────────────────────────

@app.post('/api/resume/upload')
async def upload_resume(file: UploadFile = File(...)):
    """Parse resume and run AI analysis."""
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, 'File too large (max 10MB)')

    try:
        text = parse_resume(content, file.filename or 'resume.pdf')
    except Exception as e:
        raise HTTPException(400, f'Could not parse file: {e}')

    if len(text.strip()) < 50:
        raise HTTPException(400, 'Resume appears empty or unreadable')

    settings = get_settings()
    analysis = {}
    if settings.claudeApiKey:
        try:
            analysis = analyze_resume(text, settings.claudeApiKey)
        except Exception:
            analysis = _fallback_analysis()
    else:
        analysis = _fallback_analysis()

    return {
        'text': text,
        'char_count': len(text),
        'analysis': analysis,
    }


def _fallback_analysis():
    return {
        'score': 7,
        'skills': ['Communication', 'Problem Solving', 'Teamwork'],
        'experience_level': 'Mid-level',
        'suggested_roles': ['Software Engineer', 'Data Analyst', 'Project Manager'],
        'summary': 'Professional with relevant experience. Add your Claude API key in Settings for detailed AI analysis.',
    }

# ─── Job search ──────────────────────────────────────────────────────────────

class JobSearchRequest(BaseModel):
    query: str
    location: str = ''
    sites: List[str] = ['linkedin', 'naukri', 'indeed']
    method: Literal['scraping', 'api', 'browser'] = 'scraping'
    max_results: int = 20
    resume_text: str = ''
    api_keys: dict = {}

@app.post('/api/jobs/search')
async def search_jobs(req: JobSearchRequest):
    """Search jobs across all configured sites."""
    if not req.query.strip():
        raise HTTPException(400, 'Search query cannot be empty')

    settings = get_settings()
    api_keys = req.api_keys or {}

    jobs = await search_all_sites(
        query=req.query.strip(),
        location=req.location.strip(),
        sites=req.sites or ['linkedin', 'naukri', 'indeed'],
        method=req.method,
        max_results=min(req.max_results, 50),
        resume_text=req.resume_text,
        api_keys=api_keys,
        ai_api_key=settings.claudeApiKey,
    )

    return {'jobs': [j.to_dict() for j in jobs], 'total': len(jobs)}

# ─── Resume tailoring ────────────────────────────────────────────────────────

class TailorRequest(BaseModel):
    resume_text: str
    job_title: str
    job_description: str
    company: str = ''
    claude_api_key: str = ''

@app.post('/api/resume/tailor')
async def tailor_resume_endpoint(req: TailorRequest):
    """Generate a tailored resume and study topics for a specific job."""
    if not req.resume_text.strip():
        raise HTTPException(400, 'Resume text is required')

    settings = get_settings()
    api_key = req.claude_api_key or settings.claudeApiKey

    # tailor_resume handles both keyed (Claude AI) and keyless (smart keyword analysis)
    result = tailor_resume(
        resume_text=req.resume_text,
        job_title=req.job_title,
        job_description=req.job_description,
        company=req.company,
        api_key=api_key,
    )
    return result

# ─── Resume export ───────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    resume_text: str
    format: Literal['pdf', 'docx'] = 'pdf'
    filename: str = 'tailored_resume'

@app.post('/api/resume/export')
async def export_resume(req: ExportRequest):
    """Export a resume as PDF or DOCX."""
    if not req.resume_text.strip():
        raise HTTPException(400, 'No resume text provided')

    if req.format == 'pdf':
        file_bytes = generate_pdf(req.resume_text, req.filename)
        media_type = 'application/pdf'
        ext = 'pdf'
    else:
        file_bytes = generate_docx(req.resume_text)
        media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ext = 'docx'

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={'Content-Disposition': f'attachment; filename="{req.filename}.{ext}"'},
    )

# ─── Health check ────────────────────────────────────────────────────────────

@app.get('/health')
def health():
    return {'status': 'ok', 'version': '1.0.0'}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=False, log_level='info')
