"""Orchestrate searches across multiple job sites with match scoring."""
import asyncio
import re
from typing import List, Dict, Any

from .base import Job
from .linkedin_scraper import scrape_linkedin, api_linkedin, browser_linkedin
from .naukri_scraper import scrape_naukri, api_naukri, browser_naukri
from .indeed_scraper import scrape_indeed, scrape_glassdoor, browser_indeed
from .remoteok_scraper import scrape_remoteok


async def search_all_sites(
    query: str,
    location: str,
    sites: List[str],
    method: str,          # 'scraping' | 'api' | 'browser'
    max_results: int,
    resume_text: str,
    api_keys: Dict[str, str],
    ai_api_key: str = '',
) -> List[Job]:
    """Search all configured job sites and return scored, deduplicated results."""

    # Always include RemoteOK (free real data) alongside configured sites
    all_sites = list(dict.fromkeys(sites + ['remoteok']))

    tasks = [
        _search_site(site, query, location, method, max_results, api_keys)
        for site in all_sites
    ]

    # Run all site searches concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_jobs: List[Job] = []
    for r in results:
        if isinstance(r, list):
            all_jobs.extend(r)
        elif isinstance(r, Exception):
            print(f'[Orchestrator] Site task error: {r}')

    # Score jobs against resume
    all_jobs = _score_jobs(all_jobs, resume_text, query)

    # Sort by match score
    all_jobs.sort(key=lambda j: j.match_score, reverse=True)

    # Deduplicate by title+company
    seen = set()
    deduped = []
    for j in all_jobs:
        key = (j.title.lower().strip(), j.company.lower().strip())
        if key not in seen:
            seen.add(key)
            deduped.append(j)

    return deduped


async def _search_site(
    site: str,
    query: str,
    location: str,
    method: str,
    max_results: int,
    api_keys: Dict[str, str],
) -> List[Job]:
    """Dispatch to the right scraper based on site and method."""
    # Use asyncio.get_running_loop() (Python 3.10+ best practice)
    loop = asyncio.get_running_loop()

    try:
        if site == 'remoteok':
            # RemoteOK is always scraped — it's a free open API
            return await loop.run_in_executor(
                None, scrape_remoteok, query, location, max_results
            )

        elif site == 'linkedin':
            if method == 'browser':
                return await browser_linkedin(query, location, max_results)
            elif method == 'api':
                return await loop.run_in_executor(
                    None, api_linkedin, query, location, max_results, api_keys.get('linkedin', '')
                )
            else:
                return await loop.run_in_executor(
                    None, scrape_linkedin, query, location, max_results
                )

        elif site == 'naukri':
            if method == 'browser':
                return await browser_naukri(query, location, max_results)
            elif method == 'api':
                return await loop.run_in_executor(
                    None, api_naukri, query, location, max_results, api_keys.get('naukri', '')
                )
            else:
                return await loop.run_in_executor(
                    None, scrape_naukri, query, location, max_results
                )

        elif site == 'indeed':
            if method == 'browser':
                return await browser_indeed(query, location, max_results)
            else:
                return await loop.run_in_executor(
                    None, scrape_indeed, query, location, max_results
                )

        elif site == 'glassdoor':
            return await loop.run_in_executor(
                None, scrape_glassdoor, query, location, max_results
            )

        return []

    except Exception as e:
        print(f'[Scraper] {site} failed: {e}')
        return []


def _score_jobs(jobs: List[Job], resume_text: str, query: str) -> List[Job]:
    """
    Fast keyword-based match scoring — no API call needed.
    Scores 0.0–1.0 based on skill overlap between resume and job description.
    """
    resume_words = set(re.findall(r'\b\w{3,}\b', resume_text.lower()))
    query_words  = set(query.lower().split())

    for job in jobs:
        jd_words  = set(re.findall(r'\b\w{3,}\b', job.description.lower()))
        jd_title  = set(re.findall(r'\b\w{3,}\b', job.title.lower()))

        if not jd_words:
            job.match_score = 0.5
            continue

        # Overlap between resume skills and job description
        overlap     = resume_words & jd_words
        base_score  = min(len(overlap) / max(len(jd_words), 1) * 3, 0.9)

        # Bonus if query words appear in job title
        title_bonus = 0.15 if query_words & jd_title else 0.0

        job.match_score = round(min(base_score + title_bonus, 1.0), 2)

    return jobs
