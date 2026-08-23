"""
SQLAlchemy models. Includes the 'jobs' table and the 'resume_profiles'
table (a temporary, structured profile built from an uploaded resume).
"""
from sqlalchemy import Column, String, Text, JSON, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    external_id = Column(String, index=True)       # the dataset's own job_id (for traceability)
    title = Column(String, nullable=False)
    company = Column(String)
    location = Column(String)
    description = Column(Text)
    source_platform = Column(String, index=True)   # linkedin / naukri / indeed / internshala / other
    source_raw = Column(String)                     # dataset's original 'via' value (for debugging)
    apply_link = Column(String)
    employment_type = Column(String)                # Full-time / Internship / etc.
    posted_at = Column(DateTime, nullable=True)      # when the job was originally posted (from dataset)

    # Structured signals extracted by AI
    tags = Column(JSON, default=list)             # e.g. ["Python", "SQL", "Fresher"]
    experience_level = Column(String)              # fresher / junior / mid / senior

    # Normalized hash for dedup (based on title+company+location)
    raw_hash = Column(String, unique=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    resume_profiles = relationship("ResumeProfile", back_populates="user")
    applications = relationship("Application", back_populates="user")
    saved_jobs = relationship("SavedJob", back_populates="user")


class Application(Base):
    """
    Records that a logged-in user applied to a job. Created only through
    the protected POST /api/jobs/{job_id}/apply endpoint -- so "applying"
    is always tied to a real authenticated user, never anonymous.
    """
    __tablename__ = "applications"
    __table_args__ = (
        # One application per user per job -- re-clicking "Apply" on the
        # same job should not create duplicate rows.
        UniqueConstraint("user_id", "job_id", name="uq_application_user_job"),
    )

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    applied_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="applications")
    job = relationship("Job")


class SavedJob(Base):
    """
    Records that a logged-in user bookmarked a job to look at later.
    Mirrors the Application model's shape/pattern -- only reachable through
    the protected save/unsave endpoints, so it's always tied to a real
    authenticated user, and a user can only save the same job once.
    """
    __tablename__ = "saved_jobs"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_saved_job_user_job"),
    )

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    saved_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job")


class ResumeProfile(Base):
    __tablename__ = "resume_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    raw_text = Column(Text)
    skills = Column(JSON, default=list)
    experience_summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="resume_profiles")
