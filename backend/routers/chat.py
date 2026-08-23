"""
Conversational AI assistant. The user's own Gemini API key is sent with
the request -- it is never persisted on the server (a security
requirement for this project).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Job, ResumeProfile
from schemas import ChatRequest, ChatResponse
from services.gemini_client import call_gemini

router = APIRouter(prefix="/api/chat", tags=["chat"])


def build_context(db: Session, job_id: str | None, resume_profile_id: str | None) -> str:
    context_parts = []

    if job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            context_parts.append(
                f"Job: {job.title} at {job.company}\n"
                f"Tags: {', '.join(job.tags or [])}\n"
                f"Description: {(job.description or '')[:2000]}"
            )

    if resume_profile_id:
        profile = db.query(ResumeProfile).filter(ResumeProfile.id == resume_profile_id).first()
        if profile:
            context_parts.append(
                f"Candidate skills: {', '.join(profile.skills or [])}\n"
                f"Candidate summary: {profile.experience_summary or ''}"
            )

    return "\n\n".join(context_parts)


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    context = build_context(db, req.job_id, req.resume_profile_id)

    prompt = f"""You are a helpful career assistant inside a job board app.
Use the context below (if any) to answer the user's question about jobs,
their fit, missing skills, or preparation advice. Be concise and practical.

Context:
{context if context else "No specific job or resume context provided."}

User question: {req.message}
"""

    try:
        reply = await call_gemini(prompt, req.gemini_api_key)
    except Exception as e:
        # Pass the real reason through (invalid key, retired model, quota,
        # etc.) instead of a generic message -- this is what shows up in
        # the chat widget, so it's self-diagnosing instead of a dead end.
        raise HTTPException(status_code=400, detail=str(e))

    return ChatResponse(reply=reply)
