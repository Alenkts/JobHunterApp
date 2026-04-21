"""Application tracker — persist saved jobs and their status to disk."""
import json
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

TRACKER_FILE = Path.home() / '.jobhunter_tracker.json'

# ── Models ────────────────────────────────────────────────────────────────────

class TrackerJob(BaseModel):
    id: str
    title: str
    company: str
    location: str
    url: str
    source: str
    description: str = ''
    salary: str = ''
    tags: List[str] = []
    match_score: float = 0.0
    status: str = 'saved'        # saved | applied | interviewing | offer | rejected
    notes: str = ''
    saved_at: str = ''
    applied_at: str = ''
    updated_at: str = ''

# ── Persistence ───────────────────────────────────────────────────────────────

def _load() -> List[TrackerJob]:
    if TRACKER_FILE.exists():
        try:
            raw = json.loads(TRACKER_FILE.read_text())
            return [TrackerJob(**item) for item in raw]
        except Exception:
            pass
    return []


def _save(jobs: List[TrackerJob]):
    TRACKER_FILE.write_text(
        json.dumps([j.model_dump() for j in jobs], indent=2)
    )

# ── CRUD ──────────────────────────────────────────────────────────────────────

def get_all() -> List[TrackerJob]:
    return _load()


def save_job(job_data: dict) -> TrackerJob:
    """Add or update a job in the tracker."""
    jobs = _load()
    now = datetime.now(timezone.utc).isoformat()
    job_id = job_data.get('id', '')

    # If already tracked, update it
    for existing in jobs:
        if existing.id == job_id:
            existing.updated_at = now
            _save(jobs)
            return existing

    new_job = TrackerJob(
        id=job_id,
        title=job_data.get('title', ''),
        company=job_data.get('company', ''),
        location=job_data.get('location', ''),
        url=job_data.get('url', ''),
        source=job_data.get('source', ''),
        description=job_data.get('description', ''),
        salary=job_data.get('salary', '') or '',
        tags=job_data.get('tags', []),
        match_score=job_data.get('match_score', 0.0),
        status='saved',
        saved_at=now,
        updated_at=now,
    )
    jobs.append(new_job)
    _save(jobs)
    return new_job


def update_status(job_id: str, status: str, notes: Optional[str] = None) -> Optional[TrackerJob]:
    jobs = _load()
    now = datetime.now(timezone.utc).isoformat()
    for job in jobs:
        if job.id == job_id:
            job.status = status
            job.updated_at = now
            if status == 'applied' and not job.applied_at:
                job.applied_at = now
            if notes is not None:
                job.notes = notes
            _save(jobs)
            return job
    return None


def update_notes(job_id: str, notes: str) -> Optional[TrackerJob]:
    jobs = _load()
    now = datetime.now(timezone.utc).isoformat()
    for job in jobs:
        if job.id == job_id:
            job.notes = notes
            job.updated_at = now
            _save(jobs)
            return job
    return None


def remove_job(job_id: str) -> bool:
    jobs = _load()
    before = len(jobs)
    jobs = [j for j in jobs if j.id != job_id]
    if len(jobs) < before:
        _save(jobs)
        return True
    return False


def is_saved(job_id: str) -> bool:
    return any(j.id == job_id for j in _load())
