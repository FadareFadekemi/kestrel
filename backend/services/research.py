import os
import asyncio
import httpx
from typing import AsyncGenerator
from tavily import TavilyClient
from exa_py import Exa


def _extract_domain(input_str: str, sources: list) -> str:
    """Best-effort domain extraction from input or source URLs."""
    candidates = [input_str] + [s.get("url", "") for s in sources]
    for c in candidates:
        if not c:
            continue
        d = c.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        if "." in d and len(d) > 3:
            return d
    return ""


async def _hunter_lookup(domain: str, api_key: str) -> str:
    """Return best contact email for domain via Hunter.io, or empty string."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                "https://api.hunter.io/v2/domain-search",
                params={"domain": domain, "limit": 10, "api_key": api_key},
            )
        if r.status_code != 200:
            return ""
        emails = r.json().get("data", {}).get("emails", [])
        if not emails:
            return ""
        decision_keywords = [
            "vp", "director", "head", "manager", "ceo", "cmo", "cro",
            "founder", "chief", "president", "owner", "partner",
        ]
        for email in emails:
            pos = (email.get("position") or "").lower()
            if any(kw in pos for kw in decision_keywords):
                return email.get("value", "")
        # Fall back to highest-confidence email
        return max(emails, key=lambda e: e.get("confidence", 0)).get("value", "")
    except Exception:
        return ""

TECH_MARKERS = [
    "salesforce", "hubspot", "intercom", "zendesk", "slack", "notion",
    "linear", "figma", "stripe", "segment", "mixpanel", "amplitude",
    "outreach", "salesloft", "apollo", "clearbit", "zoominfo", "gong",
    "marketo", "pardot", "drift", "calendly", "greenhouse", "lever",
    "jira", "confluence", "asana", "monday", "clickup", "airtable",
    "datadog", "pagerduty", "snowflake", "dbt", "looker", "tableau",
    "aws", "gcp", "azure", "vercel", "netlify", "heroku",
    "react", "next.js", "vue", "angular", "typescript",
]

COMPETITOR_MARKERS = [
    "outreach.io", "salesloft", "apollo.io", "zoominfo", "seamless.ai",
    "lusha", "hunter.io", "lemlist", "reply.io", "instantly", "smartlead",
]


async def run_research_agent(input_str: str) -> AsyncGenerator[dict, None]:
    tavily_key = os.getenv("VITE_TAVILY_API_KEY")
    exa_key    = os.getenv("VITE_EXA_API_KEY")

    if not tavily_key:
        yield {"event": "error", "data": {"message": "VITE_TAVILY_API_KEY not set in .env"}}
        return
    if not exa_key:
        yield {"event": "error", "data": {"message": "VITE_EXA_API_KEY not set in .env"}}
        return

    yield {"event": "status", "data": {"text": "Querying Tavily for company intelligence..."}}

    is_url = input_str.startswith("http") or "." in input_str
    company_query = (
        f"{input_str} company overview funding team"
        if is_url else
        f"{input_str} company overview funding tech stack B2B"
    )
    news_query = f"{input_str} recent news 2025 2026 funding product hiring"

    tv = TavilyClient(api_key=tavily_key)

    # Run Tavily searches in a thread (sync SDK)
    loop = asyncio.get_event_loop()
    tavily_main, tavily_news = await asyncio.gather(
        loop.run_in_executor(None, lambda: tv.search(
            company_query, search_depth="advanced", max_results=5, include_answer=True
        )),
        loop.run_in_executor(None, lambda: tv.search(
            news_query, search_depth="advanced", max_results=4, include_answer=True
        )),
    )

    yield {"event": "status", "data": {"text": "Querying Exa for funding signals & technographics..."}}

    exa_results = []
    try:
        exa = Exa(api_key=exa_key)
        exa_resp = await loop.run_in_executor(None, lambda: exa.search(
            f"{input_str} B2B SaaS sales team product company",
            type="company",
            num_results=3,
            contents={"text": {"max_characters": 1500}},
        ))
        exa_results = exa_resp.results or []
    except Exception:
        pass  # Exa may not have results — gracefully continue

    yield {"event": "status", "data": {"text": "Processing results..."}}

    # Build company name
    company_name = input_str
    if is_url:
        domain = input_str.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        base = domain.split(".")[0]
        company_name = base[0].upper() + base[1:]

    # Detect tech / competitors from all text
    all_text = " ".join([
        tavily_main.get("answer") or "",
        *[r.get("content", "") for r in tavily_main.get("results", [])],
        tavily_news.get("answer") or "",
        *[r.get("content", "") for r in tavily_news.get("results", [])],
        *[getattr(r, "text", "") or "" for r in exa_results],
    ]).lower()

    detected_tech        = [t for t in TECH_MARKERS        if t in all_text][:8]
    detected_competitors = [c for c in COMPETITOR_MARKERS  if c in all_text]

    sources = [
        {"title": r.get("title", ""), "url": r.get("url", "")}
        for r in [*tavily_main.get("results", []), *tavily_news.get("results", [])]
    ][:6]

    exa_enrichment = [
        {
            "title": getattr(r, "title", ""),
            "url":   getattr(r, "url", ""),
            "highlight": (getattr(r, "text", "") or "")[:200],
        }
        for r in exa_results[:2]
    ]

    # Hunter.io contact email lookup
    hunter_key   = os.getenv("HUNTER_API_KEY")
    contact_email = ""
    if hunter_key:
        yield {"event": "status", "data": {"text": "Looking up contact email..."}}
        domain = _extract_domain(input_str, sources)
        if domain:
            contact_email = await _hunter_lookup(domain, hunter_key)

    research = {
        "companyName":    company_name,
        "input":          input_str,
        "summary":        tavily_main.get("answer") or (tavily_main.get("results") or [{}])[0].get("content", "")[:600] or "No summary available.",
        "recentNews":     tavily_news.get("answer") or (tavily_news.get("results") or [{}])[0].get("content", "")[:400] or "No recent news found.",
        "sources":        sources,
        "techStack":      detected_tech,
        "competitors":    detected_competitors,
        "exaEnrichment":  exa_enrichment,
        "contactEmail":   contact_email,
    }

    yield {"event": "result", "data": research}
