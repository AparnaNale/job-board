"""
Thin wrapper around the Gemini API. A single shared function reused by
other services (tagging, recommender, chat assistant) -- so API call
error handling lives in one place.

Model note: gemini-1.5-flash and then gemini-2.5-flash were both retired
in quick succession as Google pushes users onto the 3.x line. Now on
gemini-3.6-flash (current GA stable Flash model as of Aug 2026). Google
retires models on an aggressive cadence, so if the chat assistant starts
erroring again later, check https://ai.google.dev/gemini-api/docs/models
for the current stable model name before assuming the bug is elsewhere --
the error message Gemini returns usually names the replacement directly.
"""
import httpx

GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-3.6-flash:generateContent"
)


async def call_gemini(prompt: str, api_key: str) -> str:
    if not api_key:
        raise ValueError("Gemini API key required")

    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{GEMINI_ENDPOINT}?key={api_key}",
            json=payload,
        )
        if resp.status_code >= 400:
            # Surface Gemini's own error message (invalid/expired key,
            # retired model, quota exceeded, etc.) instead of a bare
            # status code -- routers/chat.py passes this straight through
            # as the 400 detail, so it's what actually shows up in the UI.
            try:
                detail = resp.json().get("error", {}).get("message") or resp.text
            except Exception:
                detail = resp.text
            raise RuntimeError(f"Gemini API error ({resp.status_code}): {detail}")
        data = resp.json()

    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        return "Sorry, I couldn't generate a response right now."
