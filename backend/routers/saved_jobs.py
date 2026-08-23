"""
"Save for later" endpoints. Kept in their own router (instead of nested
under /api/jobs/{job_id}/...) so the "list my saved jobs" route doesn't
collide with GET /api/jobs/{job_id} -- FastAPI would otherwise try to treat
"saved" as a job_id if this lived under the jobs prefix.

All routes require a logged-in user -- get_current_user raises 401 before
any handler body runs, so saving is always tied to a real account.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Job, SavedJob, User
from schemas import JobOut, SaveStatusResponse
from dependencies import get_current_user

router = APIRouter(prefix="/api/saved-jobs", tags=["saved-jobs"])


@router.get("", response_model=List[JobOut])
def list_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Most-recently-saved first."""
    rows = (
        db.query(SavedJob, Job)
        .join(Job, Job.id == SavedJob.job_id)
        .filter(SavedJob.user_id == current_user.id)
        .order_by(SavedJob.saved_at.desc())
        .all()
    )
    return [JobOut.model_validate(job) for _saved, job in rows]


@router.post("/{job_id}", response_model=SaveStatusResponse)
def save_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
    )
    if existing:
        # Already saved -- treat as idempotent rather than erroring, since
        # the frontend just wants "it's saved" to be true either way.
        return SaveStatusResponse(
            saved=True,
            saved_at=existing.saved_at.isoformat() if existing.saved_at else None,
        )

    saved = SavedJob(user_id=current_user.id, job_id=job_id)
    db.add(saved)
    db.commit()
    db.refresh(saved)

    return SaveStatusResponse(saved=True, saved_at=saved.saved_at.isoformat() if saved.saved_at else None)


@router.delete("/{job_id}", response_model=SaveStatusResponse)
def unsave_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()

    return SaveStatusResponse(saved=False, saved_at=None)


@router.get("/{job_id}/status", response_model=SaveStatusResponse)
def get_save_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lets job cards / the detail page show a filled-in bookmark on load."""
    existing = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
    )
    return SaveStatusResponse(
        saved=bool(existing),
        saved_at=existing.saved_at.isoformat() if existing and existing.saved_at else None,
    )
