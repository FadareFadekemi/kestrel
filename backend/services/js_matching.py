import os
import json
import asyncio
from typing import AsyncGenerator
from openai import AsyncOpenAI
from tavily import TavilyClient


async def run_job_matching(profile: dict) -> AsyncGenerator[dict, None]:
    openai_key = os.getenv("VITE_OPENAI_API_KEY")
    tavily_key = os.getenv("VITE_TAVILY_API_KEY")

    if not openai_key:
        yield {"event": "error", "data": {"message": "VITE_OPENAI_API_KEY not set"}}
        return
    if not tavily_key:
        yield {"event": "error", "data": {"message": "VITE_TAVILY_API_KEY not set"}}
        return

    target_role  = profile.get("targetRole", "")
    location     = profile.get("location", "Nigeria")
    experience   = profile.get("experience", "")
    education    = profile.get("education", "")

    yield {"event": "status", "data": {"text": "Identifying target sectors…"}}

    client = AsyncOpenAI(api_key=openai_key)

    sector_resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": (
            f"List 6-8 industry sectors actively hiring '{target_role}' in Nigeria in 2025-2026. "
            f"Candidate: {experience} experience, {education} qualification, based in {location}. "
            "Focus on sectors with real growth and hiring activity in Nigeria. "
            'Return JSON: {"sectors": ["sector1", "sector2", ...]}'
        )}],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    try:
        sectors = json.loads(sector_resp.choices[0].message.content).get("sectors", [])
    except Exception:
        sectors = ["Technology", "Finance", "Healthcare", "FMCG", "Telecoms", "Oil & Gas"]

    yield {"event": "status", "data": {"text": f"Searching {len(sectors)} sectors for openings…"}}

    tv   = TavilyClient(api_key=tavily_key)
    loop = asyncio.get_event_loop()

    async def search_sector(sector):
        try:
            return await loop.run_in_executor(None, lambda: tv.search(
                f"{sector} companies Nigeria hiring {target_role} 2025 2026",
                search_depth="basic", max_results=3, include_answer=True,
            ))
        except Exception:
            return {}

    search_results = await asyncio.gather(*[search_sector(s) for s in sectors])

    combined_snippets = []
    for sector, result in zip(sectors, search_results):
        answer  = result.get("answer", "")
        results = result.get("results", [])
        snippet = answer or (results[0].get("content", "") if results else "")
        if snippet:
            combined_snippets.append(f"[{sector}]: {snippet[:400]}")

    context = "\n\n".join(combined_snippets[:8])

    yield {"event": "status", "data": {"text": "Generating company matches…"}}

    synthesis_prompt = f"""You are a career matching engine for Nigerian job seekers.
Based on the research below, identify 8-10 specific companies in Nigeria that are a strong match
for this candidate.

Candidate profile:
- Target role: {target_role}
- Experience: {experience}
- Education: {education}
- Location: {location}

Market research:
{context}

Return ONLY valid JSON:
{{
  "companies": [
    {{
      "name": "string",
      "sector": "string",
      "size": "Startup | SME | Enterprise | MNC",
      "location": "string (Nigerian city)",
      "remote": true | false,
      "hiringSignal": "one sentence on why they may be hiring",
      "roleFit": 0-100,
      "description": "one sentence about the company",
      "verified": true | false,
      "website": "domain only or null"
    }}
  ]
}}"""

    full_text = ""
    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": synthesis_prompt}],
        stream=True, temperature=0.35,
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


async def run_scam_detection(text: str) -> dict:
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        return {
            "risk_level": "Suspicious",
            "scam_signals": [],
            "explanation": "AI analysis unavailable. Review manually against common scam patterns.",
        }

    client = AsyncOpenAI(api_key=api_key)

    resp = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": (
            "You are a fraud detection system for Nigerian job seekers. "
            f"Analyse this job listing for scam signals:\n\n{text[:3000]}\n\n"
            "Return JSON: "
            '{ "risk_level": "Safe" | "Suspicious" | "Likely Scam", '
            '"scam_signals": ["signal1", "signal2"], '
            '"explanation": "string (under 50 words)" }'
        )}],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {
            "risk_level": "Suspicious",
            "scam_signals": [],
            "explanation": "Could not parse AI response. Review the listing manually.",
        }
