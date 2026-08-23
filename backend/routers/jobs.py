"""GET endpoints for browsing jobs.

PERFORMANCE NOTE: with a large dataset (50k+ jobs), this endpoint used to
return EVERY matching row in one response, and the frontend loaded all of
it into the browser to filter client-side. That does not scale -- the
payload alone can be tens of MB. Now:
  - /api/jobs is paginated (limit/offset), filtering happens in the
    database, not in Python after fetching everything.
  - /api/jobs/facets returns just the distinct platforms + top tags, so
    the filter dropdowns don't need the full dataset either.
  - The listing response also truncates each job's description, since the
    card view never displays the full text anyway.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, String, text
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from database import get_db, engine
from models import Job, Application, User
from schemas import JobOut, PaginatedJobs, ApplyResponse
from dependencies import get_current_user

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _to_card_out(job: Job) -> JobOut:
    out = JobOut.model_validate(job)
    if out.description and len(out.description) > 200:
        out.description = out.description[:200] + "…"
    return out


@router.get("", response_model=PaginatedJobs)
def list_jobs(
    source: Optional[str] = Query(None, description="linkedin | naukri | indeed | internshala"),
    tag: Optional[str] = Query(None, description="skill / role tag, e.g. Python, Data Science"),
    location: Optional[str] = Query(None, description="partial, case-insensitive match on location"),
    experience_level: Optional[str] = Query(None, description="fresher | junior | mid | senior"),
    q: Optional[str] = Query(None, description="search by role/job title, partial case-insensitive match"),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Job)

    if source:
        query = query.filter(Job.source_platform == source.lower())

    if tag:
        # Filtered at the DB level (tags stored as JSON) instead of pulling
        # every row into Python and checking `tag in job.tags` there.
        query = query.filter(cast(Job.tags, String).ilike(f'%"{tag}"%'))

    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))

    if experience_level:
        query = query.filter(Job.experience_level == experience_level.lower())

    if q:
        # Role/title search -- partial, case-insensitive. Kept separate
        # from `tag` (which matches the AI-assigned skill tags) since this
        # matches free-text against the job title itself.
        query = query.filter(Job.title.ilike(f"%{q}%"))

    total = query.count()
    jobs = (
        query.order_by(Job.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return PaginatedJobs(
        items=[_to_card_out(j) for j in jobs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/facets")
def get_facets(db: Session = Depends(get_db)):
    """
    Lightweight endpoint just for populating the filter dropdowns --
    distinct platforms, locations, experience levels + the most common
    tags -- WITHOUT loading all 56k+ job rows into the app to compute
    this client-side.
    """
    sources = [
        row[0]
        for row in db.query(Job.source_platform)
        .filter(Job.source_platform.isnot(None))
        .distinct()
        .order_by(Job.source_platform)
        .all()
    ]

    # Ordered by how common each level should be in practice, not
    # alphabetically -- makes the sidebar dropdown read naturally.
    _EXPERIENCE_ORDER = ["fresher", "junior", "mid", "senior", "unspecified"]
    existing_levels = {
        row[0]
        for row in db.query(Job.experience_level)
        .filter(Job.experience_level.isnot(None))
        .distinct()
        .all()
    }
    experience_levels = [lvl for lvl in _EXPERIENCE_ORDER if lvl in existing_levels]
    experience_levels += sorted(existing_levels - set(_EXPERIENCE_ORDER))

    # Locations: capped and ordered by frequency so the dropdown leads
    # with the cities that actually have the most listings, instead of
    # every one-off location string in the dataset.
    location_rows = (
        db.query(Job.location, text("count(*) as c"))
        .filter(Job.location.isnot(None), Job.location != "")
        .group_by(Job.location)
        .order_by(text("c DESC"))
        .limit(60)
        .all()
    )
    locations = [row[0] for row in location_rows]

    tags: List[str] = []
    try:
        if engine.dialect.name == "postgresql":
            rows = db.execute(
                text(
                    """
                    SELECT tag, COUNT(*) AS c
                    FROM jobs, json_array_elements_text(tags) AS tag
                    GROUP BY tag
                    ORDER BY c DESC
                    LIMIT 30
                    """
                )
            ).fetchall()
            tags = [r[0] for r in rows]
        else:
            # SQLite (local dev) fallback -- json_array_elements_text is
            # Postgres-only, so approximate from a sample instead of the
            # full table.
            sample = db.query(Job.tags).limit(2000).all()
            counts = {}
            for (job_tags,) in sample:
                for t in job_tags or []:
                    counts[t] = counts.get(t, 0) + 1
            tags = [t for t, _ in sorted(counts.items(), key=lambda x: -x[1])[:30]]
    except Exception:
        tags = []

    return {
        "sources": sources,
        "tags": tags,
        "locations": locations,
        "experience_levels": experience_levels,
    }


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/{job_id}/apply", response_model=ApplyResponse)
def apply_to_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 401 automatically if not logged in
):
    """
    Only a logged-in user can reach this -- get_current_user raises 401
    on a missing/invalid token before this body even runs. Recording the
    application here (not just gating in the frontend) means "apply" is
    always tied to a real account, not something a user could bypass by
    calling the API directly or editing the frontend.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = (
        db.query(Application)
        .filter(Application.user_id == current_user.id, Application.job_id == job_id)
        .first()
    )
    if existing:
        return ApplyResponse(
            already_applied=True,
            apply_link=job.apply_link,
            applied_at=existing.applied_at.isoformat() if existing.applied_at else None,
        )

    application = Application(user_id=current_user.id, job_id=job_id)
    db.add(application)
    db.commit()
    db.refresh(application)

    return ApplyResponse(
        already_applied=False,
        apply_link=job.apply_link,
        applied_at=application.applied_at.isoformat() if application.applied_at else None,
    )


@router.get("/{job_id}/apply-status", response_model=ApplyResponse)
def get_apply_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lets the job detail page show 'Already applied' on page load/refresh."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = (
        db.query(Application)
        .filter(Application.user_id == current_user.id, Application.job_id == job_id)
        .first()
    )
    return ApplyResponse(
        already_applied=bool(existing),
        apply_link=job.apply_link,
        applied_at=existing.applied_at.isoformat() if existing and existing.applied_at else None,
    )