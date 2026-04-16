import os
import json
import asyncio
from typing import AsyncGenerator
from openai import AsyncOpenAI

TONE_INSTRUCTIONS = {
    "Formal":       "Write formally — no contractions, full sentences, ROI-focused. Reference the contact by full name.",
    "Consultative": "Write as a trusted advisor — lead with insight about their business, not your product. Ask a thoughtful question.",
    "Casual":       "Write peer-to-peer — < 5 sentences, first names only, no jargon. Sound like a colleague, not a vendor.",
    "Aggressive":   "Write with urgency — bold claim or result first, FOMO, social proof. Push directly for a 15-min call.",
}


async def _stream_json(prompt: str, temperature: float = 0.7) -> AsyncGenerator[dict, None]:
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        yield {"event": "error", "data": {"message": "VITE_OPENAI_API_KEY not set in .env"}}
        return

    client    = AsyncOpenAI(api_key=api_key)
    full_text = ""

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        temperature=temperature,
        response_format={"type": "json_object"},
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_text += delta
            yield {"event": "stream", "data": {"text": delta}}

    # Yield the parsed result as a final event
    try:
        yield {"event": "result", "data": json.loads(full_text)}
    except json.JSONDecodeError:
        yield {"event": "result", "data": {"error": "Parse failed", "raw": full_text}}


async def run_email_writer(profile: dict, tone: str = "Consultative", variant: str = "A", sender: dict = {}) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": f"Drafting {tone} email (Variant {variant})..."}}

    tech_mention    = ", ".join((profile.get("techStack") or [])[:3]) or "your current stack"

    # Build sender context from profile
    sender_name     = sender.get("name") or "{{senderName}}"
    sender_company  = sender.get("companyName") or "our company"
    sender_title    = sender.get("senderTitle") or ""
    product_desc    = sender.get("productDescription") or "an AI-powered B2B sales tool"
    value_prop      = sender.get("valueProposition") or ""

    competitor_note = (
        f"Important: They currently use {profile['competitorName']} which overlaps with what {sender_company} offers. "
        "Reference this tactfully to create a displacement angle."
        if profile.get("usesCompetitor") and profile.get("competitorName") else ""
    )

    prompt = f"""You are an elite B2B SDR writing a cold outreach email on behalf of the sender below.

SENDER (the person sending this email):
- Name: {sender_name}
- Title: {sender_title}
- Company: {sender_company}
- What they sell: {product_desc}
- Key value proposition: {value_prop if value_prop else "(derive from product description)"}

TARGET (the lead being contacted):
- Company: {profile.get("companyName")}
- Contact: {profile.get("contactName", "the decision maker")}, {profile.get("contactTitle", "Sales Leader")}
- Industry: {profile.get("industry")}
- Company size: {profile.get("companySize")}
- Pain points: {"; ".join((profile.get("painPoints") or [])[:3])}
- Growth signals: {"; ".join((profile.get("growthSignals") or [])[:2])}
- Tech stack: {tech_mention}

Tone: {tone}
Tone guidance: {TONE_INSTRUCTIONS.get(tone, "")}
{competitor_note}
Variant: {"Lead with the target's biggest pain point and how the sender's product solves it" if variant == "A" else "Lead with a growth signal or recent news about the target, then connect to the sender's product"}

Requirements:
- Subject line (< 8 words, compelling)
- Body: 100-160 words max
- Soft CTA: 15-min call (not "schedule a demo")
- Use {{{{firstName}}}} for contact first name
- Use {{{{senderName}}}} for sender name

Return ONLY valid JSON:
{{
  "subject": "string",
  "body": "string with \\n for line breaks",
  "tone": "{tone}",
  "variant": "{variant}",
  "wordCount": number
}}"""

    async for chunk in _stream_json(prompt, temperature=0.7):
        yield chunk


async def run_sequence_writer(profile: dict, primary_email: dict) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": "Generating 3-touch follow-up sequence..."}}

    prompt = f"""You are an elite B2B SDR building a follow-up sequence for a non-responder.

Company: {profile.get("companyName")}
Contact: {profile.get("contactName")}, {profile.get("contactTitle")}
Initial email subject: "{primary_email.get("subject")}"
Initial tone: {primary_email.get("tone")}

Build a 3-touch sequence. Rules:
- Each email gets shorter than the last
- Add new value each time — never just "following up"
- Day 7 is a short breakup email that gives them an easy out
- Use {{{{firstName}}}} and {{{{senderName}}}} placeholders

Return ONLY valid JSON:
{{
  "sequence": [
    {{"day": 0, "subject": "string", "body": "string", "tone": "string", "note": "strategy note"}},
    {{"day": 3, "subject": "string", "body": "string", "tone": "string", "note": "strategy note"}},
    {{"day": 7, "subject": "string", "body": "string", "tone": "string", "note": "strategy note"}}
  ]
}}"""

    result_data = None
    async for chunk in _stream_json(prompt, temperature=0.65):
        if chunk["event"] == "result":
            result_data = chunk["data"]
            # Override day 0 with the actual primary email
            if result_data.get("sequence") and len(result_data["sequence"]) > 0:
                result_data["sequence"][0]["subject"] = primary_email.get("subject", "")
                result_data["sequence"][0]["body"]    = primary_email.get("body", "")
                result_data["sequence"][0]["tone"]    = primary_email.get("tone", "")
            yield {"event": "result", "data": result_data}
        else:
            yield chunk


async def run_ab_variants(profile: dict, tone: str = "Consultative", sender: dict = {}) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": f"Generating A/B variants ({tone})..."}}

    # Run both variants concurrently, collecting results
    results = {"A": None, "B": None}

    async def collect(variant: str):
        async for chunk in run_email_writer(profile, tone, variant, sender):
            if chunk["event"] == "result":
                results[variant] = chunk["data"]

    await asyncio.gather(collect("A"), collect("B"))
    yield {"event": "result", "data": results}
