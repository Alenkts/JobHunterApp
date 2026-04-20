"""App-wide configuration and settings persistence."""
import json
import os
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional

SETTINGS_FILE = Path.home() / '.jobhunter_settings.json'

class Settings(BaseModel):
    claudeApiKey: str = ''
    linkedinApiKey: str = ''
    scrapeMethod: str = 'scraping'   # scraping | api | browser
    jobSites: List[str] = ['linkedin', 'naukri', 'indeed']
    maxResults: int = 20

_settings = Settings()

def load_settings() -> Settings:
    global _settings
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text())
            _settings = Settings(**data)
        except Exception:
            pass
    # Env overrides
    if key := os.getenv('ANTHROPIC_API_KEY'):
        _settings.claudeApiKey = key
    return _settings

def save_settings(s: Settings):
    global _settings
    _settings = s
    SETTINGS_FILE.write_text(s.model_dump_json(indent=2))

def get_settings() -> Settings:
    return _settings

load_settings()
