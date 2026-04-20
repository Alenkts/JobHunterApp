"""Naukri.com job scraper — three methods."""
import json
import re
import time
import urllib.parse
from typing import List
from .base import Job, get_session, clean_text


# ─── Method 1: HTTP scraping ─────────────────────────────────────────────────

def scrape_naukri(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """Scrape Naukri.com job listings via their internal API endpoint."""
    session = get_session()
    session.headers.update({
        'appid': '109',
        'systemid': 'Naukri',
        'Referer': 'https://www.naukri.com',
    })

    params = {
        'noOfResults': min(max_results, 20),
        'urlType': 'search_by_keyword',
        'searchType': 'adv',
        'keyword': query,
        'location': location,
        'pageNo': 1,
        'seoKey': f'{urllib.parse.quote(query.lower().replace(" ", "-"))}-jobs',
        'src': 'jobsearchDesk',
        'latLong': '',
    }

    url = 'https://www.naukri.com/jobapi/v3/search?' + urllib.parse.urlencode(params)

    try:
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return _fallback_naukri_jobs(query, location)

        data = resp.json()
        job_items = data.get('jobDetails', [])
        jobs = []

        for item in job_items:
            jd_text = _build_naukri_description(item)
            jobs.append(Job(
                title=clean_text(item.get('title', '')),
                company=clean_text(item.get('companyName', '')),
                location=', '.join(item.get('placeholders', [{}])[0].get('label', '').split(',')[:2]),
                description=jd_text,
                url='https://www.naukri.com' + item.get('jdURL', ''),
                salary=item.get('salary', ''),
                posted_at=item.get('footerPlaceholderLabel', ''),
                source='naukri',
                tags=item.get('tagsAndSkills', '').split(',')[:5] if item.get('tagsAndSkills') else [],
            ))
            time.sleep(0.2)

        return jobs or _fallback_naukri_jobs(query, location)

    except Exception:
        return _fallback_naukri_jobs(query, location)


def _build_naukri_description(item: dict) -> str:
    parts = []
    if desc := item.get('jobDescription', ''):
        parts.append(clean_text(re.sub(r'<[^>]+>', ' ', desc)))
    if skills := item.get('tagsAndSkills', ''):
        parts.append(f'\nRequired Skills: {skills}')
    if exp := item.get('experienceText', ''):
        parts.append(f'Experience: {exp}')
    return '\n'.join(parts)


# ─── Method 2: API (Naukri Partner API) ──────────────────────────────────────

def api_naukri(query: str, location: str = '', max_results: int = 20,
               api_key: str = '') -> List[Job]:
    """
    Naukri Partner API — requires approved partner credentials.
    Falls back to scraping if no credentials provided.
    """
    if not api_key:
        return scrape_naukri(query, location, max_results)

    session = get_session()
    session.headers['Authorization'] = f'Bearer {api_key}'

    try:
        resp = session.get(
            'https://developer.naukri.com/v1/jobs/search',
            params={'query': query, 'location': location, 'count': max_results},
            timeout=15,
        )
        if resp.status_code != 200:
            return scrape_naukri(query, location, max_results)

        data = resp.json()
        return [
            Job(
                title=j.get('title', ''),
                company=j.get('company', ''),
                location=j.get('location', location),
                description=j.get('description', ''),
                url=j.get('applyUrl', ''),
                salary=j.get('salary', ''),
                source='naukri',
            )
            for j in data.get('jobs', [])
        ]
    except Exception:
        return scrape_naukri(query, location, max_results)


# ─── Method 3: Playwright ────────────────────────────────────────────────────

async def browser_naukri(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """Use Playwright headless browser to scrape Naukri.
    Note: Naukri actively blocks headless browsers, so this will typically
    fall back to the HTTP scraper which uses their internal JSON API.
    """
    try:
        from playwright.async_api import async_playwright
        jobs = []
        q_slug = urllib.parse.quote(query.lower().replace(' ', '-'))
        l_slug = urllib.parse.quote(location.lower().replace(' ', '-')) if location else 'india'
        url = f'https://www.naukri.com/{q_slug}-jobs-in-{l_slug}'

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_extra_http_headers({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                              'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            await page.goto(url, timeout=30000)
            await page.wait_for_timeout(3000)

            # Try multiple selector strategies (Naukri changes their DOM frequently)
            card_selectors = ['.jobTuple', '.srp-jobtuple-wrapper', 'article[data-job-id]',
                              'div[class*="styles_jlc"]', '.cust-job-tuple']
            cards = []
            for sel in card_selectors:
                cards = await page.query_selector_all(sel)
                if cards:
                    break

            for card in cards[:max_results]:
                try:
                    title_el   = await card.query_selector('.title, a.title, h2')
                    company_el = await card.query_selector('.companyInfo span, .comp-name, span[class*="comp"]')
                    loc_el     = await card.query_selector('.locWdth, .loc-wrap, span[class*="loc"]')
                    link_el    = await card.query_selector('a.title, a[href*="naukri.com"]')
                    desc_el    = await card.query_selector('.job-description, .job-desc')

                    jobs.append(Job(
                        title=clean_text(await title_el.inner_text()) if title_el else '',
                        company=clean_text(await company_el.inner_text()) if company_el else '',
                        location=clean_text(await loc_el.inner_text()) if loc_el else location,
                        url=await link_el.get_attribute('href') if link_el else '',
                        description=clean_text(await desc_el.inner_text()) if desc_el else '',
                        source='naukri',
                    ))
                except Exception:
                    continue
            await browser.close()

        # If Playwright found real jobs, return them;
        # otherwise fall back to the HTTP scraper (not mock data)
        if jobs:
            return jobs
        print('[Naukri] Browser found 0 cards — falling back to HTTP scraper')
        return scrape_naukri(query, location, max_results)
    except ImportError:
        return scrape_naukri(query, location, max_results)
    except Exception as e:
        print(f'[Naukri] Browser error: {e} — falling back to HTTP scraper')
        return scrape_naukri(query, location, max_results)


# ─── Fallback ────────────────────────────────────────────────────────────────

def _role_keyword(query: str) -> str:
    """Extract primary skill keyword, stripping trailing generic role words."""
    role_suffixes = ['developer', 'engineer', 'analyst', 'designer', 'manager',
                     'lead', 'architect', 'specialist', 'consultant', 'scientist']
    words = query.title().split()
    if len(words) > 1 and words[-1].lower() in role_suffixes:
        return ' '.join(words[:-1])
    return query.title()

def _fallback_naukri_jobs(query: str, location: str) -> List[Job]:
    """Return empty list when Naukri scraping fails — no mock data."""
    print(f'[Naukri] Scraping failed for "{query}" in "{location}" — returning empty')
    return []

