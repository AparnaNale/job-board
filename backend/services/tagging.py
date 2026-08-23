"""
AI-based job classification & tagging.

This module sends each job description to Gemini once (offline, while
running the seed script) and gets back structured tags -- we don't want
an AI call on every request in live traffic (to save cost + latency).
The result is saved into Job.tags and Job.experience_level.
"""
import json
import re
from services.gemini_client import call_gemini

TAGGING_PROMPT = """You are extracting structured hiring signals from a job description.
Return ONLY valid JSON, no markdown, no extra text, in this exact shape:
{{
  "skills": ["Python", "SQL", ...],
  "role_category": "Data Science" | "Software Engineering" | "Other",
  "experience_level": "fresher" | "junior" | "mid" | "senior"
}}

Job description:
\"\"\"{description}\"\"\"
"""


def _extract_json(raw: str) -> dict:
    """Gemini sometimes wraps the response in ```json fences -- strip those before parsing."""
    cleaned = re.sub(r"```json|```", "", raw).strip()
    return json.loads(cleaned)


async def tag_job_description(description: str, api_key: str) -> dict:
    prompt = TAGGING_PROMPT.format(description=description[:4000])
    raw = await call_gemini(prompt, api_key)
    try:
        parsed = _extract_json(raw)
    except (json.JSONDecodeError, ValueError):
        # Fallback: if the AI response isn't valid JSON, use empty defaults
        # so the job doesn't fail entirely.
        parsed = {"skills": [], "role_category": "Other", "experience_level": "unspecified"}

    tags = parsed.get("skills", [])
    if parsed.get("role_category"):
        tags.append(parsed["role_category"])
    if parsed.get("experience_level"):
        tags.append(parsed["experience_level"].capitalize())

    return {
        "tags": list(dict.fromkeys(tags)),  # dedupe, keep order
        "experience_level": parsed.get("experience_level", "unspecified"),
    }
