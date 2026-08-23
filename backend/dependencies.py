"""
FastAPI dependencies for reading the logged-in user from the
`Authorization: Bearer <token>` header.

Two variants:
- get_current_user       -> 401 if missing/invalid token (protected routes)
- get_current_user_optional -> returns None if missing/invalid, doesn't fail
  (used on routes like resume upload that should still work for anonymous
  users, but personalize the response when a valid token is present)
"""
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from database import get_db
from models import User
from services.auth import decode_access_token


def _extract_user(authorization: str | None, db: Session) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload:
        return None
    return db.query(User).filter(User.id == payload.get("sub")).first()


def get_current_user_optional(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    return _extract_user(authorization, db)


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User:
    user = _extract_user(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Login required.")
    return user
