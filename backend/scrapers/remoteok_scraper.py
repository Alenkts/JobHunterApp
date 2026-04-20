"""RemoteOK scraper — free public API, no auth required, real live jobs."""
import time
import requests
from typing import List
from .base import Job, clean_text

REMOTEOK_URL = 'https://remoteok.com/api'

def scrape_remoteok(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """
    Fetch real remote jobs from RemoteOK's public API.
    No API key needed. Returns live data.
    """
    try:
        headers = {
            'User-Agent': 'JobHunterAI/1.0 (job search app)',
            'Accept': 'application/json',
        }
        # Build tag list from query (e.g. "python developer" → ["python", "developer"])
        tags = [t.strip().lower().replace(' ', '-') for t in query.split() if len(t) > 2]
        tag_param = '+'.join(tags[:3])   # max 3 tags

        resp = requests.get(
            f'{REMOTEOK_URL}?tag={tag_param}',
            headers=headers,
            timeout=12,
        )
        if resp.status_code != 200:
            return []

        data = resp.json()
        if not isinstance(data, list) or len(data) < 2:
            return []

        jobs: List[Job] = []
        for item in data[1:]:   # first element is metadata object
            if not isinstance(item, dict):
                continue
            title = clean_text(item.get('position', ''))
            if not title:
                continue

            # Filter by query keyword (RemoteOK tags are broad)
            q_lower = query.lower()
            combined = (title + ' ' + ' '.join(item.get('tags', []))).lower()
            if not any(word in combined for word in q_lower.split()):
                continue

            salary = ''
            if item.get('salary_min') and item.get('salary_max'):
                salary = f"${item['salary_min']:,} – ${item['salary_max']:,}"

            jobs.append(Job(
                title=title,
                company=clean_text(item.get('company', '')),
                location='Remote',
                description=_build_description(item),
                url=item.get('url') or f"https://remoteok.com/remote-jobs/{item.get('id', '')}",
                salary=salary or None,
                posted_at=_relative_date(item.get('date', '')),
                source='remoteok',
                tags=[t for t in item.get('tags', [])[:6] if t],
            ))

            if len(jobs) >= max_results:
                break

        return jobs

    except Exception as e:
        print(f'[RemoteOK] Error: {e}')
        return []


def _build_description(item: dict) -> str:
    parts = []
    if desc := item.get('description', ''):
        import re
        # Strip HTML tags
        plain = re.sub(r'<[^>]+>', ' ', desc)
        plain = re.sub(r'\s+', ' ', plain).strip()
        parts.append(plain[:2000])
    if tags := item.get('tags', []):
        parts.append(f'\nRequired skills: {", ".join(tags)}')
    return '\n'.join(parts)


def _relative_date(iso: str) -> str:
    """Convert ISO date string to a human-friendly relative string."""
    if not iso:
        return ''
    try:
        from datetime import datetime, timezone
        dt = datetime.fromisoformat(iso.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        days = (now - dt).days
        if days == 0:
            return 'Today'
        if days == 1:
            return 'Yesterday'
        if days < 7:
            return f'{days} days ago'
        if days < 30:
            return f'{days // 7} weeks ago'
        return f'{days // 30} months ago'
    except Exception:
        return iso[:10]
