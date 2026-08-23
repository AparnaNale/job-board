"""
Signup / Login / Me endpoints.

Passwords are never stored in plain text (bcrypt hash only). Login issues
a JWT the frontend stores and sends back as `Authorization: Bearer <token>`
on requests that need to know who the user is (e.g. resume upload, so
recommendations can be tied to their account instead of being anonymous).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import SignupRequest, LoginRequest, AuthResponse, UserOut
from services.auth import hash_password, verify_password, create_access_token
from dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    # Same error for "no such user" and "wrong password" — don't leak
    # which one it was, to avoid helping account-enumeration attempts.
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id, user.email)
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
