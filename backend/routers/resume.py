"""
Resume upload -> parse -> profile extraction -> job recommendations.

Profile extraction has two paths (see services/resume_parser.py):
  - If the request includes a Gemini API key, extract_profile_ai() is
    tried first -- this is the "AI/LLM-based resume analysis" path
    (PDF page 5).
  - If no key is given, or the AI call fails for any reason (invalid key,
    quota, network error, bad JSON), we fall back to the deterministic
    rule-based extract_profile() -- so the feature never hard-fails just
    because AI wasn't available.

Either way, the skills list feeds the same deterministic overlap-scoring
in services/recommender.py -- that scoring step stays explainable
regardless of which extraction path produced the skills.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import Job, ResumeProfile, User
from services.resume_parser import extract_text, extract_profile, extract_profile_ai
from services.recommender import rank_job_ids
from dependencies import get_current_user_optional

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    gemini_api_key: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    file_bytes = await file.read()

    try:
        resume_text = extract_text(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Legacy .doc files (old binary format, not the .docx zip format
        # python-docx expects), corrupt/password-protected PDFs, etc. all
        # land here. Without this, an unhandled exception here can abort
        # the connection before any response (CORS headers included) is
        # sent -- which the browser then misreports as a CORS error
        # instead of showing the real problem.
        raise HTTPException(
            status_code=400,
            detail=f"Could not read this file ({e.__class__.__name__}). "
            "If it's an old .doc file, try re-saving it as .docx or PDF.",
        )

    if not resume_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from this resume. If it's a scanned/image PDF, try a text-based resume instead.",
        )

    used_ai = False
    if gemini_api_key:
        try:
            profile = await extract_profile_ai(resume_text, gemini_api_key)
            used_ai = True
        except Exception:
            # Invalid/expired key, quota exceeded, network error, bad JSON
            # from the model, etc. -- don't fail the whole upload, just
            # fall back to the deterministic rule-based extractor.
            profile = extract_profile(resume_text)
    else:
        profile = extract_profile(resume_text)

    saved_profile = ResumeProfile(
        user_id=current_user.id if current_user else None,
        raw_text=resume_text[:10000],
        skills=profile.get("skills", []),
        experience_summary=profile.get("experience_summary", ""),
    )
    db.add(saved_profile)
    db.commit()
    db.refresh(saved_profile)

    # Memory-conscious two-pass lookup instead of `db.query(Job).all()`:
    # on a 512MB container, loading every job's full description text
    # (potentially thousands of rows) just to compute a tag-overlap score
    # was enough to exceed the memory limit and get the process killed
    # (see services/recommender.py for details). Pass 1 pulls only
    # (id, tags) for every job -- a small fraction of the memory of full
    # rows -- and scores those. Pass 2 fetches full details for only the
    # handful of ids that actually made the top_n cut.
    id_tag_pairs = db.query(Job.id, Job.tags).all()
    ranked_ids = rank_job_ids(profile.get("skills", []), id_tag_pairs)

    score_by_id = dict(ranked_ids)
    if ranked_ids:
        top_jobs = db.query(Job).filter(Job.id.in_(score_by_id.keys())).all()
    else:
        top_jobs = []
    # in_() doesn't preserve order, so re-sort to match the ranking
    top_jobs.sort(key=lambda job: score_by_id[job.id], reverse=True)

    recommendations = []
    for job in top_jobs:
        job_out = {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "source_platform": job.source_platform,
            "apply_link": job.apply_link,
            "tags": job.tags,
            "experience_level": job.experience_level,
            "match_score": score_by_id[job.id],
        }
        recommendations.append(job_out)

    return {
        "profile_id": saved_profile.id,
        "profile": {
            "skills": profile.get("skills", []),
            "experience_summary": profile.get("experience_summary", ""),
        },
        "used_ai": used_ai,
        "recommendations": recommendations,
    }