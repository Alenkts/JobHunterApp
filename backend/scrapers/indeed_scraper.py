"""Indeed & Glassdoor job scrapers."""
import time
import urllib.parse
from typing import List
from .base import Job, get_session, clean_text


# ─── Indeed ──────────────────────────────────────────────────────────────────

def scrape_indeed(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """Scrape Indeed job listings."""
    session = get_session()
    params = {
        'q': query,
        'l': location,
        'fromage': '14',  # last 14 days
        'limit': min(max_results, 25),
    }
    url = 'https://www.indeed.com/jobs?' + urllib.parse.urlencode(params)

    try:
        from bs4 import BeautifulSoup
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return _fallback_indeed(query, location)

        soup = BeautifulSoup(resp.text, 'lxml')
        jobs = []

        for card in soup.find_all('div', class_='job_seen_beacon', limit=max_results):
            try:
                title_el   = card.find('h2', class_='jobTitle')
                company_el = card.find('span', class_='companyName')
                loc_el     = card.find('div', class_='companyLocation')
                salary_el  = card.find('div', class_='salary-snippet-container')
                desc_el    = card.find('div', class_='job-snippet')
                link_el    = card.find('a', id=lambda x: x and x.startswith('job_'))

                title = clean_text(title_el.get_text()) if title_el else ''
                if not title:
                    continue

                job_id = link_el['data-jk'] if link_el and link_el.get('data-jk') else ''
                job_url = f'https://www.indeed.com/viewjob?jk={job_id}' if job_id else ''

                jobs.append(Job(
                    title=title,
                    company=clean_text(company_el.get_text()) if company_el else '',
                    location=clean_text(loc_el.get_text()) if loc_el else location,
                    description=clean_text(desc_el.get_text('\n')) if desc_el else '',
                    url=job_url,
                    salary=clean_text(salary_el.get_text()) if salary_el else None,
                    source='indeed',
                ))
                time.sleep(0.2)
            except Exception:
                continue

        return jobs or _fallback_indeed(query, location)

    except Exception:
        return _fallback_indeed(query, location)


async def browser_indeed(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """Playwright-based Indeed scraper. Uses stealth and forces location if ignored."""
    try:
        from playwright.async_api import async_playwright
        from playwright_stealth import Stealth
        jobs = []
        url = f'https://www.indeed.com/jobs?q={urllib.parse.quote(query)}&l={urllib.parse.quote(location)}'

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                           'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()
            await Stealth().apply_stealth_async(page)

            print(f'[Indeed] Navigating to: {url}')
            await page.goto(url, timeout=45000)
            await page.wait_for_timeout(5000)

            title = await page.title()
            print(f'[Indeed] Page title: {title}')
            if 'blocked' in title.lower() or 'access denied' in title.lower() or 'hcaptcha' in await page.content():
                 print('[Indeed] ⚠️ BLOCKED by Cloudflare/Bot-Check')

            # --- Fix: Ensure location is actually applied ---
            if location:
                try:
                    # Check what's in the 'where' input
                    for sel in ['#text-input-where', 'input[name="l"]']:
                        try:
                            where_val = await page.input_value(sel)
                            if location.lower() not in where_val.lower():
                                print(f'[Indeed] Location mismatch in {sel}: expected {location}, found {where_val}. Typing it manually...')
                                await page.fill(sel, '')
                                await page.fill(sel, location)
                                await page.press(sel, 'Enter')
                                await page.wait_for_timeout(4000)
                                break
                        except:
                            continue
                except Exception as e:
                    print(f'[Indeed] Could not verify/fix location box: {e}')

            # Wait for results or timeout
            try:
                await page.wait_for_selector('.job_seen_beacon', timeout=10000)
            except:
                pass

            cards = await page.query_selector_all('.job_seen_beacon')
            for card in cards[:max_results]:
                try:
                    # Extended selectors based on common Indeed variants
                    t = await card.query_selector('a.jcs-JobTitle, h2.jobTitle, .jobTitle a')
                    c = await card.query_selector('span[data-testid="company-name"], .companyName, [data-test="employerName"]')
                    l = await card.query_selector('div[data-testid="text-location"], .companyLocation, .location')
                    d = await card.query_selector('.job-snippet, .job-description')

                    title = clean_text(await t.inner_text()) if t else ''
                    if not title:
                        continue

                    job_url = ''
                    # Try to find the link specifically
                    link_el = await card.query_selector('a[href*="/rc/clk"], a[href*="/viewjob"], a.jcs-JobTitle')
                    if link_el:
                        href = await link_el.get_attribute('href')
                        if href:
                            job_url = f'https://www.indeed.com{href}' if href.startswith('/') else href
                    
                    if not job_url and t:
                        href = await t.get_attribute('href')
                        if href:
                            job_url = f'https://www.indeed.com{href}' if href.startswith('/') else href

                    print(f'[Indeed] Found job: {title} @ {job_url[:50]}...')
                    jobs.append(Job(
                        title=title,
                        company=clean_text(await c.inner_text()) if c else '',
                        location=clean_text(await l.inner_text()) if l else location,
                        description=clean_text(await d.inner_text()) if d else '',
                        url=job_url,
                        source='indeed',
                    ))
                except Exception:
                    continue
            await browser.close()
        return jobs or _fallback_indeed(query, location)
    except ImportError:
        return scrape_indeed(query, location, max_results)
    except Exception as e:
        print(f'[Indeed] Browser error: {e}')
        return _fallback_indeed(query, location)


def _role_keyword(query: str) -> str:
    role_suffixes = ['developer', 'engineer', 'analyst', 'designer', 'manager',
                     'lead', 'architect', 'specialist', 'consultant', 'scientist']
    words = query.title().split()
    if len(words) > 1 and words[-1].lower() in role_suffixes:
        return ' '.join(words[:-1])
    return query.title()

def _fallback_indeed(query: str, location: str) -> List[Job]:
    """Return empty list when Indeed scraping fails — no mock data."""
    print(f'[Indeed] Scraping failed for "{query}" in "{location}" — returning empty')
    return []



# ─── Glassdoor ───────────────────────────────────────────────────────────────

def scrape_glassdoor(query: str, location: str = '', max_results: int = 20) -> List[Job]:
    """Scrape Glassdoor job listings."""
    session = get_session()
    params = {
        'sc.keyword': query,
        'locT': 'C',
        'locId': '1147401',  # default: US
        'jobType': '',
    }

    try:
        from bs4 import BeautifulSoup
        url = f'https://www.glassdoor.com/Job/{urllib.parse.quote(query.lower())}-jobs-SRCH_KO0,{len(query)}.htm'
        resp = session.get(url, timeout=15)
        if resp.status_code != 200:
            return _fallback_glassdoor(query, location)

        soup = BeautifulSoup(resp.text, 'lxml')
        jobs = []

        for card in soup.find_all('li', {'data-test': 'jobListing'}, limit=max_results):
            try:
                title   = card.find('a', {'data-test': 'job-title'})
                company = card.find('span', {'data-test': 'employerName'})
                loc     = card.find('span', {'data-test': 'emp-location'})
                salary  = card.find('span', {'data-test': 'detailSalary'})

                if not title: continue
                jobs.append(Job(
                    title=clean_text(title.get_text()),
                    company=clean_text(company.get_text()) if company else '',
                    location=clean_text(loc.get_text()) if loc else location,
                    url='https://glassdoor.com' + (title.get('href', '') or ''),
                    salary=clean_text(salary.get_text()) if salary else None,
                    source='glassdoor',
                ))
            except Exception:
                continue

        return jobs or _fallback_glassdoor(query, location)
    except Exception:
        return _fallback_glassdoor(query, location)


def _fallback_glassdoor(query: str, location: str) -> List[Job]:
    """Return empty list when Glassdoor scraping fails — no mock data."""
    print(f'[Glassdoor] Scraping failed for "{query}" in "{location}" — returning empty')
    return []

