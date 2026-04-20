"""Base scraper interface and shared utilities."""
import uuid
import re
from dataclasses import dataclass, field
from typing import List, Optional
import requests

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/122.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

@dataclass
class Job:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ''
    company: str = ''
    location: str = ''
    description: str = ''
    url: str = ''
    salary: Optional[str] = None
    posted_at: Optional[str] = None
    source: str = ''
    tags: List[str] = field(default_factory=list)
    match_score: float = 0.0

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'title': self.title,
            'company': self.company,
            'location': self.location,
            'description': self.description,
            'url': self.url,
            'salary': self.salary,
            'posted_at': self.posted_at,
            'source': self.source,
            'tags': self.tags,
            'match_score': self.match_score,
        }


def get_session() -> requests.Session:
    s = requests.Session()
    s.headers.update(HEADERS)
    return s


def clean_text(text: str) -> str:
    """Normalize whitespace and remove HTML entities."""
    text = re.sub(r'\s+', ' ', text or '')
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&#\d+;', '', text)
    return text.strip()
