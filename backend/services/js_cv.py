import os
import json
from typing import AsyncGenerator
from openai import AsyncOpenAI


async def _stream_json(system: str, user: str, temperature: float = 0.3) -> AsyncGenerator[dict, None]:
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        yield {"event": "error", "data": {"message": "VITE_OPENAI_API_KEY not set"}}
        return

    client    = AsyncOpenAI(api_key=api_key)
    full_text = ""

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        stream=True,
        temperature=temperature,
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
        yield {"event": "result", "data": {"error": "Parse failed", "raw": full_text[:500]}}


async def run_cv_analysis(cv_text: str) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": "Analysing your CV…"}}
    async for chunk in _stream_json(
        system=(
            "You are a professional CV reviewer for Nigerian job seekers. "
            "Score this CV on Content (40pts), Format (25pts), Keywords (25pts), and Length (10pts). "
            'Return JSON: { "total_score": int, "content_score": int, "format_score": int, '
            '"keyword_score": int, "length_score": int, '
            '"improvements": [{"section": "string", "issue": "string", "rewrite": "string"}] }'
        ),
        user=f"CV to review:\n\n{cv_text[:4000]}",
    ):
        yield chunk


async def run_improve_summary(summary: str, target_role: str) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": "Rewriting summary…"}}
    async for chunk in _stream_json(
        system="You are a professional CV writer for Nigerian job seekers.",
        user=(
            f"Rewrite this professional summary for a candidate targeting '{target_role}'. "
            "2-3 sentences, punchy, specific, achievement-focused. No fluff or clichés. "
            f"Original: {summary}\n\n"
            'Return JSON: {"improved": "string"}'
        ),
    ):
        yield chunk


async def run_improve_bullet(bullet: str, role: str) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": "Improving bullet point…"}}
    async for chunk in _stream_json(
        system="You are a professional CV writer for Nigerian job seekers.",
        user=(
            "Rewrite this CV bullet point as a strong quantified achievement using STAR or XYZ format. "
            f"Role context: {role}\n"
            f"Original: {bullet}\n\n"
            'Return JSON: {"improved": "string"}'
        ),
    ):
        yield chunk


async def run_suggest_skills(target_role: str, current_skills: list) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": "Generating skill suggestions…"}}
    current = ", ".join(current_skills[:20]) or "none listed"
    async for chunk in _stream_json(
        system="You are a career advisor for Nigerian job seekers.",
        user=(
            f"Suggest 8-10 additional skills for a '{target_role}' candidate in Nigeria. "
            f"Current skills: {current}. "
            "Mix technical and soft skills relevant to the Nigerian job market. "
            'Return JSON: {"skills": ["skill1", "skill2", ...]}'
        ),
    ):
        yield chunk


async def run_jd_match(cv_text: str, jd_text: str) -> AsyncGenerator[dict, None]:
    yield {"event": "status", "data": {"text": "Matching CV to job description…"}}
    async for chunk in _stream_json(
        system="You are a CV and JD matching expert for Nigerian job seekers.",
        user=(
            f"Analyse how well this CV matches the job description.\n\n"
            f"CV:\n{cv_text[:2000]}\n\n"
            f"Job Description:\n{jd_text[:1500]}\n\n"
            "Return JSON:\n"
            '{ "match_score": 0-100, "present_keywords": ["..."], "missing_keywords": ["..."], '
            '"suggestions": [{"section": "Summary|Skills|Experience", "rewrite": "specific rewrite"}] }'
        ),
        temperature=0.4,
    ):
        yield chunk
