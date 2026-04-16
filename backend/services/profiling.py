import os
import json
from typing import AsyncGenerator
from openai import AsyncOpenAI


async def run_profiling_agent(research: dict) -> AsyncGenerator[dict, None]:
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        yield {"event": "error", "data": {"message": "VITE_OPENAI_API_KEY not set in .env"}}
        return

    yield {"event": "status", "data": {"text": "GPT-4o synthesizing lead profile..."}}

    tech_str        = ", ".join(research.get("techStack", [])) or "Unknown"
    competitor_str  = ", ".join(research.get("competitors", [])) or "None detected"
    exa_str         = " | ".join(e.get("highlight", "") for e in research.get("exaEnrichment", []))

    prompt = f"""You are a B2B sales intelligence analyst. Based on the research below, produce a structured lead profile.

Company: {research.get("companyName")}
Research Summary: {research.get("summary")}
Recent News: {research.get("recentNews")}
Detected Tech Stack: {tech_str}
Detected Competitors in use: {competitor_str}
Exa enrichment: {exa_str}

Return ONLY valid JSON (no markdown, no code blocks):
{{
  "companyName": "string",
  "industry": "specific vertical e.g. 'B2B SaaS / HR Tech'",
  "companySize": "headcount range e.g. '51-200'",
  "location": "city, country",
  "fundingStage": "e.g. 'Series B', 'Bootstrapped', 'Unknown'",
  "contactName": "likely decision maker from research, else 'Unknown'",
  "contactTitle": "e.g. 'VP of Sales', 'CEO'",
  "painPoints": ["5 specific pain points relevant to AI sales automation"],
  "growthSignals": ["3 signals the company is actively scaling sales/GTM"],
  "techStack": ["tools the company uses"],
  "competitors": ["competitor tools they use"],
  "usesCompetitor": true/false,
  "competitorName": "string or null",
  "icp_fit": "one sentence on why they fit the ICP for an AI outbound sales tool",
  "scores": {{
    "overall": 0-100,
    "techFit": 0-100,
    "sizeFit": 0-100,
    "timing": 0-100,
    "growthIndicators": 0-100
  }},
  "scoreReasoning": "2-3 sentences explaining the score"
}}"""

    client = AsyncOpenAI(api_key=api_key)
    full_text = ""

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_text += delta
            yield {"event": "stream", "data": {"text": delta}}

    try:
        profile = json.loads(full_text)
        # Merge detected tech stack in case GPT missed items
        gpt_tech   = [t.lower() for t in profile.get("techStack", [])]
        extra_tech = [t for t in research.get("techStack", []) if t.lower() not in gpt_tech]
        profile["techStack"] = (profile.get("techStack") or []) + extra_tech

        detected_comps = research.get("competitors", [])
        if detected_comps and not profile.get("usesCompetitor"):
            profile["usesCompetitor"]  = True
            profile["competitors"]     = list(set((profile.get("competitors") or []) + detected_comps))
            profile["competitorName"]  = profile.get("competitorName") or detected_comps[0]
    except json.JSONDecodeError:
        profile = {"error": "Failed to parse profile JSON", "raw": full_text}

    yield {"event": "result", "data": profile}
