"""Claude AI integration for resume analysis and tailoring."""
import json
import re
from collections import Counter
from typing import Optional, List

# ── Shared client ────────────────────────────────────────────────────────────

def _client(api_key: str):
    import anthropic
    return anthropic.Anthropic(api_key=api_key)

def _chat(api_key: str, prompt: str, system: str = '', max_tokens: int = 4096) -> str:
    client = _client(api_key)
    msg = client.messages.create(
        model='claude-opus-4-6',
        max_tokens=max_tokens,
        system=system or 'You are a professional career coach and resume expert.',
        messages=[{'role': 'user', 'content': prompt}],
    )
    return msg.content[0].text

def _json(text: str) -> dict:
    """Extract the first JSON object from a Claude response (handles markdown fences)."""
    # Strip markdown code fences if present
    text = re.sub(r'^```(?:json)?\s*', '', text.strip(), flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text.strip(), flags=re.MULTILINE)
    m = re.search(r'\{[\s\S]+\}', text)
    if m:
        return json.loads(m.group())
    raise ValueError('No JSON found in response')

# ── Smart keyword-based topic generator (no API key required) ─────────────────

# Organised by domain so we can generate meaningful topic groups
TECH_DOMAINS = {
    'languages':     ['python', 'java', 'javascript', 'typescript', 'golang', 'rust',
                      'c++', 'c#', 'ruby', 'swift', 'kotlin', 'scala', 'r'],
    'frontend':      ['react', 'angular', 'vue', 'nextjs', 'svelte', 'html', 'css',
                      'tailwind', 'redux', 'webpack', 'vite', 'graphql'],
    'backend':       ['node', 'django', 'fastapi', 'flask', 'spring', 'express',
                      'rest', 'grpc', 'microservices', 'api design'],
    'data':          ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
                      'kafka', 'spark', 'hadoop', 'dbt', 'airflow'],
    'cloud_devops':  ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
                      'ci/cd', 'jenkins', 'github actions', 'linux', 'bash'],
    'ml_ai':         ['machine learning', 'deep learning', 'nlp', 'pytorch', 'tensorflow',
                      'scikit-learn', 'llm', 'computer vision', 'data science', 'pandas',
                      'numpy', 'statistics'],
    'practices':     ['system design', 'algorithms', 'data structures', 'agile', 'scrum',
                      'tdd', 'code review', 'git', 'design patterns', 'solid principles'],
    'soft_skills':   ['leadership', 'communication', 'stakeholder management',
                      'project management', 'cross-functional', 'mentoring'],
}

PRIORITY_MAP = {
    'languages': 'high',
    'frontend':  'high',
    'backend':   'high',
    'data':      'high',
    'cloud_devops': 'medium',
    'ml_ai':     'high',
    'practices': 'medium',
    'soft_skills': 'low',
}

def generate_smart_topics(
    resume_text: str,
    job_title: str,
    job_description: str,
    company: str,
) -> List[dict]:
    """
    Generate study topics without any AI API call.
    Compares JD keywords vs resume to find gaps, then adds role-specific topics.
    Returns up to 8 prioritised topics.
    """
    jd_lower     = (job_description + ' ' + job_title).lower()
    resume_lower = resume_text.lower()
    topics = []

    # ── 1. Find skill gaps (in JD but weak/absent in resume) ─────────────────
    for domain, keywords in TECH_DOMAINS.items():
        for kw in keywords:
            in_jd     = kw in jd_lower
            in_resume = kw in resume_lower
            if in_jd and not in_resume:
                label   = kw.upper() if len(kw) <= 4 else kw.title()
                topics.append({
                    'topic': label,
                    'priority': PRIORITY_MAP[domain],
                    'reason': (
                        f'Listed in the job description but not clearly highlighted '
                        f'in your resume — make sure you can speak to {label} confidently.'
                    ),
                })

    # Sort: high → medium → low, then limit
    order = {'high': 0, 'medium': 1, 'low': 2}
    topics.sort(key=lambda t: order[t['priority']])
    topics = topics[:5]  # keep top 5 gap topics

    # ── 2. Always-present contextual topics ──────────────────────────────────
    topics.append({
        'topic': f'Company Deep-Dive: {company}',
        'priority': 'high',
        'reason': (
            f'Research {company}\'s products, recent news, tech stack, '
            f'culture and mission before the interview.'
        ),
    })
    topics.append({
        'topic': f'{job_title} — Common Interview Questions',
        'priority': 'medium',
        'reason': 'Practice role-specific technical and conceptual questions likely to come up.',
    })
    topics.append({
        'topic': 'Behavioural Interview (STAR method)',
        'priority': 'medium',
        'reason': (
            'Prepare 4–5 STAR stories covering leadership, conflict resolution, '
            'failure and achievement — asked by virtually every interviewer.'
        ),
    })

    # ── 3. System design if senior-level role ────────────────────────────────
    senior_keywords = ['senior', 'lead', 'staff', 'principal', 'architect', 'manager']
    if any(kw in job_title.lower() for kw in senior_keywords):
        topics.insert(0, {
            'topic': 'System Design Fundamentals',
            'priority': 'high',
            'reason': (
                f'Senior-level roles at {company} typically include a system '
                f'design round. Review scalability, load balancing, caching, '
                f'and database design.'
            ),
        })

    return topics[:8]


# ── Resume analysis ───────────────────────────────────────────────────────────

def analyze_resume(resume_text: str, api_key: str) -> dict:
    prompt = f"""Analyze this resume and return a JSON object with these exact keys:
- score (int 1-10): overall resume quality
- skills (list of str): top technical and soft skills detected, max 12
- experience_level (str): one of "Junior", "Mid-level", "Senior", "Lead", "Executive"
- suggested_roles (list of str): 4-6 job titles this person is well-suited for
- summary (str): 2-3 sentence professional summary of the candidate

RESUME:
{resume_text[:6000]}

Return ONLY valid JSON, no markdown fences."""

    try:
        raw = _chat(api_key, prompt, max_tokens=1500)
        return _json(raw)
    except Exception:
        return {
            'score': 7,
            'skills': ['Python', 'Communication', 'Problem Solving'],
            'experience_level': 'Mid-level',
            'suggested_roles': ['Software Engineer', 'Data Analyst'],
            'summary': 'Experienced professional with a strong technical background.',
        }

# ── Resume tailoring ──────────────────────────────────────────────────────────

def tailor_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    company: str,
    api_key: str,
) -> dict:
    # Always generate smart topics as a guaranteed baseline
    smart_topics = generate_smart_topics(resume_text, job_title, job_description, company)

    if not api_key:
        # No Claude key — return keyword-tailored resume + smart topics
        return {
            'resume_text': _keyword_boost_resume(resume_text, job_description),
            'match_score': _fast_match_score(resume_text, job_description),
            'match_reason': 'Keyword match score. Add Claude API key in Settings for full AI tailoring.',
            'key_changes': [
                'Keywords from the job description have been highlighted.',
                'Add your Claude API key in Settings for complete AI-powered rewriting.',
            ],
            'topics': smart_topics,
        }

    system = """You are an expert resume writer and career strategist. You rewrite resumes to
maximally align with specific job descriptions while maintaining truthfulness and
the candidate's authentic voice. You understand ATS (Applicant Tracking Systems)."""

    prompt = f"""Tailor the following resume for this specific job and return a JSON object.

TARGET JOB: {job_title} at {company}

JOB DESCRIPTION:
{job_description[:3000]}

ORIGINAL RESUME:
{resume_text[:4000]}

Return a JSON object with these exact keys:
- resume_text (str): the complete rewritten resume, optimizing keywords and emphasis to match
  the job description. Keep it truthful — only rephrase, never invent experience.
- match_score (int 0-100): how well the tailored resume matches the job
- match_reason (str): one sentence explaining the match score
- key_changes (list of str): 4-6 specific improvements made to the resume
- topics (list of objects): 6-8 topics the candidate should study before the interview.
  Each object has:
    - topic (str): concise topic name
    - priority ("high" | "medium" | "low")
    - reason (str): one sentence explaining why it matters for this specific role

Return ONLY valid JSON. No markdown fences, no preamble."""

    try:
        raw = _chat(api_key, prompt, system=system, max_tokens=4000)
        result = _json(raw)
        # Guarantee topics are always present and non-empty
        if not result.get('topics'):
            result['topics'] = smart_topics
        return result
    except Exception as e:
        print(f'[AI] tailor_resume failed: {e}')
        return {
            'resume_text': resume_text,
            'match_score': _fast_match_score(resume_text, job_description),
            'match_reason': 'AI tailoring encountered an error — showing smart topic analysis.',
            'key_changes': ['AI tailoring failed. Check your Claude API key in Settings.'],
            'topics': smart_topics,
        }


def _fast_match_score(resume_text: str, job_description: str) -> int:
    """Quick keyword overlap score — no API needed."""
    r_words = set(re.findall(r'\b\w{3,}\b', resume_text.lower()))
    j_words = set(re.findall(r'\b\w{3,}\b', job_description.lower()))
    if not j_words:
        return 50
    overlap = len(r_words & j_words) / len(j_words)
    return min(int(overlap * 300), 95)


def _keyword_boost_resume(resume_text: str, job_description: str) -> str:
    """
    Lightweight resume enhancement without AI:
    appends a 'Key Skills' section with JD-matching keywords not already prominent.
    """
    r_lower = resume_text.lower()
    j_lower = job_description.lower()

    extra_skills = []
    for domain_kws in TECH_DOMAINS.values():
        for kw in domain_kws:
            if kw in j_lower and kw not in r_lower:
                extra_skills.append(kw.upper() if len(kw) <= 4 else kw.title())

    if not extra_skills:
        return resume_text

    addition = (
        '\n\nADDITIONAL RELEVANT SKILLS\n'
        + ', '.join(extra_skills[:12])
        + '\n(Add your Claude API key in Settings for a fully AI-rewritten version)'
    )
    return resume_text + addition
