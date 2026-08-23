"""
Authentication helpers: password hashing (bcrypt) + JWT access tokens.

Design choice: a simple self-issued JWT rather than Supabase Auth, because
this backend already owns its own Postgres/SQLAlchemy user table and does
not use the supabase-py client anywhere else. Keeping auth in the same
stack (FastAPI + SQLAlchemy) avoids mixing two different auth systems.
"""
import os
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt has a hard 72-byte limit on the input. Truncating here (not just
# relying on the pinned bcrypt version above) means an unusually long
# password degrades gracefully instead of throwing a 500.
def _clip_to_bcrypt_limit(password: str) -> str:
    return password.encode("utf-8")[:72].decode("utf-8", errors="ignore")


def hash_password(password: str) -> str:
    return pwd_context.hash(_clip_to_bcrypt_limit(password))


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(_clip_to_bcrypt_limit(plain_password), password_hash)


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None