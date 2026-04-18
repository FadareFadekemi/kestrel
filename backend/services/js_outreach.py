import os
import json
import asyncio
from typing import AsyncGenerator
from openai import AsyncOpenAI
from tavily import TavilyClient
from exa_py import Exa


async def run_js_research(company: str, target_role: str) -> AsyncGenerator[dict, None]:
    tavily_key = os.getenv("VITE_TAVILY_API_KEY")
    exa_key    = os.getenv("VITE_EXA_API_KEY")

    if not tavily_key:
        yield {"event": "error", "data": {"message": "VITE_TAVILY_API_KEY not set"}}
        return

    yield {"event": "status", "data": {"text": f"Researching {company}…"}}

    tv   = TavilyClient(api_key=tavily_key)
    loop = asyncio.get_event_loop()

    tavily_main, tavily_news = await asyncio.gather(
        loop.run_in_executor(None, lambda: tv.search(
            f"{company} company culture jobs hiring {target_role} 2025",
            search_depth="advanced", max_results=5, include_answer=True,
        )),
        loop.run_in_executor(None, lambda: tv.search(
            f"{company} recent news hiring expansion 2025 2026",
            search_depth="advanced", max_results=3, include_answer=True,
        )),
    )

    yield {"event": "status", "data": {"text": "Searching for hiring signals…"}}

    exa_results = []
    if exa_key:
        try:
            exa = Exa(api_key=exa_key)
            exa_resp = await loop.run_in_executor(None, lambda: exa.search(
                f"{company} careers hiring {target_role}",
                type="company", num_results=3,
                contents={"text": {"max_characters": 1200}},
            ))
            exa_results = exa_resp.results or []
        except Exception:
            pass

    sources = [
        {"title": r.get("title", ""), "url": r.get("url", "")}
        for r in [*tavily_main.get("results", []), *tavily_news.get("results", [])]
    ][:6]

    research = {
        "companyName": company,
        "targetRole":  target_role,
        "summary":     (tavily_main.get("answer") or
                        (tavily_main.get("results") or [{}])[0].get("content", "")[:600] or
                        "No summary available."),
        "recentNews":  (tavily_news.get("answer") or
                        (tavily_news.get("results") or [{}])[0].get("content", "")[:400] or
                        "No recent news found."),
        "sources":     sources,
        "exaEnrichment": [
            {
                "title":     getattr(r, "title", ""),
                "url":       getattr(r, "url", ""),
                "highlight": (getattr(r, "text", "") or "")[:200],
            }
            for r in exa_results[:2]
        ],
    }

    yield {"event": "result", "data": research}


async def run_js_profiling(research: dict, target_role: str) -> AsyncGenerator[dict, None]:
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        yield {"event": "error", "data": {"message": "VITE_OPENAI_API_KEY not set"}}
        return

    yield {"event": "status", "data": {"text": "Scoring company for your profile…"}}

    exa_str = " | ".join(e.get("highlight", "") for e in research.get("exaEnrichment", []))

    prompt = f"""You are a career intelligence analyst for Nigerian job seekers. Score this company
for a candidate targeting '{target_role}'.

Company: {research.get("companyName")}
Summary: {research.get("summary")}
Recent News: {research.get("recentNews")}
Additional context: {exa_str}

Return ONLY valid JSON:
{{
  "companyName": "string",
  "industry": "string",
  "companySize": "string",
  "location": "string",
  "culture": "1-2 sentence description of company culture",
  "hiringSignals": ["signal 1", "signal 2"],
  "openRoles": ["role examples if findable"],
  "hiringManagerHint": "name and title of likely hiring manager if findable, else null",
  "scores": {{
    "roleFit": 0-100,
    "cultureFit": 0-100,
    "growthStage": 0-100,
    "hiringActivity": 0-100,
    "overall": 0-100
  }},
  "scoreReasoning": "2 sentences on fit"
}}"""

    client    = AsyncOpenAI(api_key=api_key)
    full_text = ""

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True, temperature=0.3,
        response_format={"type": "json_object"},
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_text += delta
            yield {"event": "stream", "data": {"text": delta}}

    try:
        yield {"event": "result", "data": json.loads(full_text)}
    except json.JSONDecodeError:
        yield {"event": "result", "data": {"error": "Parse failed"}}


TONE_GUIDANCE = {
    "Enthusiastic": "Show genuine excitement for the company's mission and specific recent work.",
    "Professional":  "Lead with your most relevant experience. Formal but not stiff.",
    "Concise":       "Under 80 words total. One hook, one achievement, one ask — nothing more.",
}


async def run_js_email(
    profile: dict, research: dict, candidate: dict, tone: str = "Professional"
) -> AsyncGenerator[dict, None]:
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        yield {"event": "error", "data": {"message": "VITE_OPENAI_API_KEY not set"}}
        return

    yield {"event": "status", "data": {"text": f"Writing {tone} outreach email…"}}

    prompt = f"""Write a personalised cold outreach email FROM {candidate.get("name", "the candidate")}
targeting a {candidate.get("targetRole", "suitable role")} at {profile.get("companyName")}.

Candidate:
- Name: {candidate.get("name")}
- Target role: {candidate.get("targetRole")}
- Experience: {candidate.get("experience")}
- Key skills: {candidate.get("skills", "")}

Company context:
- Hiring signals: {"; ".join(profile.get("hiringSignals") or [])}
- Recent news: {research.get("recentNews", "")[:300]}
- Recipient: {profile.get("hiringManagerHint") or "Hiring Manager"}

Tone: {tone}. {TONE_GUIDANCE.get(tone, "")}

Rules:
- Reference a SPECIFIC recent news item about the company
- Under 150 words
- No generic openers ("I hope this email finds you well")
- Soft CTA: a brief conversation, not "Can I have a job?"
- Address the email to the hiring manager by name if known

Return ONLY valid JSON:
{{
  "subject": "string (under 8 words)",
  "body": "string with \\n for line breaks",
  "tone": "{tone}",
  "wordCount": number
}}"""

    client    = AsyncOpenAI(api_key=api_key)
    full_text = ""

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a career coach writing cold outreach emails to hiring managers in Nigeria. Write a personalised email from {candidate_name} applying for a {role} at {company}. Reference a specific recent news item about the company. Under 150 words. Professional but human. No generic openers."},
            {"role": "user",   "content": prompt},
        ],
        stream=True, temperature=0.7,
        response_format={"type": "json_object"},
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_text += delta
            yield {"event": "stream", "data": {"text": delta}}

    try:
        yield {"event": "result", "data": json.loads(full_text)}
    except json.JSONDecodeError:
        yield {"event": "result", "data": {"error": "Parse failed"}}


async def run_js_followup(
    company: str, role: str, days: int, original_subject: str
) -> dict:
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        return {"subject": f"Re: {role} opportunity", "body": "Following up on my previous email. Happy to connect at a better time."}

    client = AsyncOpenAI(api_key=api_key)

    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": (
            f"Write a brief follow-up email for a job application at {company} for {role}. "
            f"It has been {days} days since the original email '{original_subject}' with no reply. "
            "Under 60 words. Add a new angle. Don't just say 'following up'. "
            "End with 'happy to connect at a better time'. "
            'Return JSON: {"subject": "string", "body": "string"}'
        )}],
        temperature=0.65,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {"subject": f"Re: {role} at {company}", "body": "Happy to connect at a better time if this isn't the right moment."}
