"""Pydantic request/response schemas."""
from pydantic import BaseModel
from typing import Optional, List


class JobOut(BaseModel):
    id: str
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    source_platform: Optional[str] = None
    apply_link: Optional[str] = None
    tags: List[str] = []
    experience_level: Optional[str] = None
    match_score: Optional[float] = None  # only populated in recommendation responses

    class Config:
        from_attributes = True


class PaginatedJobs(BaseModel):
    items: List[JobOut]
    total: int
    limit: int
    offset: int


class ChatRequest(BaseModel):
    message: str
    gemini_api_key: str
    job_id: Optional[str] = None
    resume_profile_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


# --- Auth (placeholder shapes -- replace once routers/auth.py content is
# confirmed, so these match the fields it actually returns/expects) ---
class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    user: UserOut


class SaveStatusResponse(BaseModel):
    saved: bool
    saved_at: Optional[str] = None


class ApplyResponse(BaseModel):
    already_applied: bool
    apply_link: Optional[str] = None
    applied_at: Optional[str] = None