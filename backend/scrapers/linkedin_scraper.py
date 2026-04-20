"""LinkedIn job scraper — three methods: scraping, API, browser."""
import time
import urllib.parse
from typing import List, Optional
from .base import Job, get_session, clean_text


# ─── Method 1: HTTP scraping (public feed) ────────────────────────────────────

def scrape_linkedin(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """Scrape LinkedIn public job listings (no login required)."""
    jobs: List[Job] = []
    session = get_session()

    params = {
        'keywords': query,
        'location': location,
        'f_TPR': 'r604800',   # Last 7 days
        'position': 1,
        'pageNum': 0,
        'start': 0,
    }
    url = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?' + urllib.parse.urlencode(params)

    try:
        from bs4 import BeautifulSoup
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return _fallback_linkedin_jobs(query, location)

        soup = BeautifulSoup(resp.text, 'lxml')
        cards = soup.find_all('li', limit=max_results)

        for card in cards:
            try:
                title_el   = card.find('h3', class_='base-search-card__title')
                company_el = card.find('h4', class_='base-search-card__subtitle')
                location_el= card.find('span', class_='job-search-card__location')
                link_el    = card.find('a', class_='base-card__full-link')
                time_el    = card.find('time')

                if not title_el: continue

                job_url = link_el['href'] if link_el else ''
                description = _fetch_linkedin_description(session, job_url)

                jobs.append(Job(
                    title=clean_text(title_el.text),
                    company=clean_text(company_el.text) if company_el else '',
                    location=clean_text(location_el.text) if location_el else location,
                    description=description,
                    url=job_url,
                    posted_at=time_el.get('datetime', '') if time_el else '',
                    source='linkedin',
                ))
                time.sleep(0.3)
            except Exception:
                continue

        return jobs or _fallback_linkedin_jobs(query, location)

    except Exception:
        return _fallback_linkedin_jobs(query, location)


def _fetch_linkedin_description(session, url: str) -> str:
    """Fetch job description from a LinkedIn job page."""
    if not url:
        return ''
    try:
        from bs4 import BeautifulSoup
        resp = session.get(url, timeout=10)
        soup = BeautifulSoup(resp.text, 'lxml')
        desc = soup.find('div', class_='description__text')
        if desc:
            return clean_text(desc.get_text('\n'))
        return ''
    except Exception:
        return ''


# ─── Method 2: Official LinkedIn API ─────────────────────────────────────────

def api_linkedin(query: str, location: str = '', max_results: int = 20,
                 api_key: str = '') -> List[Job]:
    """
    Fetch jobs via LinkedIn Jobs API.
    Requires a LinkedIn Developer App with the Job Search API permission.
    """
    if not api_key:
        return scrape_linkedin(query, location, max_results)

    session = get_session()
    session.headers['Authorization'] = f'Bearer {api_key}'

    params = {
        'keywords': query,
        'location': location,
        'count': min(max_results, 50),
    }
    try:
        resp = session.get(
            'https://api.linkedin.com/v2/jobSearch',
            params=params,
            timeout=15,
        )
        if resp.status_code != 200:
            return scrape_linkedin(query, location, max_results)

        data = resp.json()
        jobs = []
        for item in data.get('elements', []):
            jobs.append(Job(
                title=item.get('title', ''),
                company=item.get('companyName', ''),
                location=item.get('formattedLocation', location),
                description=item.get('description', {}).get('text', ''),
                url=item.get('applyMethod', {}).get('companyApplyUrl', ''),
                source='linkedin',
            ))
        return jobs
    except Exception:
        return scrape_linkedin(query, location, max_results)


# ─── Method 3: Playwright browser automation ─────────────────────────────────

async def browser_linkedin(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """Use Playwright to scrape LinkedIn like a human browser."""
    try:
        from playwright.async_api import async_playwright
        jobs = []
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                              'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })

            url = (f'https://www.linkedin.com/jobs/search/?keywords='
                   f'{urllib.parse.quote(query)}&location={urllib.parse.quote(location)}')
            await page.goto(url, timeout=30000)
            await page.wait_for_timeout(3000)

            cards = await page.query_selector_all('.job-search-card')
            for card in cards[:max_results]:
                try:
                    title   = await card.query_selector('.base-search-card__title')
                    company = await card.query_selector('.base-search-card__subtitle')
                    loc     = await card.query_selector('.job-search-card__location')
                    link    = await card.query_selector('a.base-card__full-link')

                    job_url = await link.get_attribute('href') if link else ''
                    jobs.append(Job(
                        title=clean_text(await title.inner_text()) if title else '',
                        company=clean_text(await company.inner_text()) if company else '',
                        location=clean_text(await loc.inner_text()) if loc else location,
                        url=job_url,
                        source='linkedin',
                    ))
                except Exception:
                    continue
            await browser.close()

        if jobs:
            return jobs
        print('[LinkedIn] Browser found 0 cards — falling back to HTTP scraper')
        return scrape_linkedin(query, location, max_results)
    except ImportError:
        return scrape_linkedin(query, location, max_results)
    except Exception as e:
        print(f'[LinkedIn] Browser error: {e} — falling back to HTTP scraper')
        return scrape_linkedin(query, location, max_results)


# ─── Fallback: realistic mock data ───────────────────────────────────────────

def _role_keyword(query: str) -> str:
    """Extract the primary skill/tech keyword from a query for use in title templates.
    e.g. 'Python Developer' -> 'Python', 'Data Analyst' -> 'Data Analyst'
    """
    role_suffixes = ['developer', 'engineer', 'analyst', 'designer', 'manager',
                     'lead', 'architect', 'specialist', 'consultant', 'scientist']
    words = query.title().split()
    # If last word is a generic role word, use the rest as the keyword
    if len(words) > 1 and words[-1].lower() in role_suffixes:
        return ' '.join(words[:-1])  # e.g. "Python Developer" → "Python"
    return query.title()


def _fallback_linkedin_jobs(query: str, location: str) -> List[Job]:
    """Return empty list when LinkedIn scraping fails — no mock data."""
    print(f'[LinkedIn] Scraping failed for "{query}" in "{location}" — returning empty')
    return []

