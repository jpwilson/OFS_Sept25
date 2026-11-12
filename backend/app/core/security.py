from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
from .config import settings

# For MVP, using simple SHA256. Will switch to bcrypt/Supabase Auth later
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

def get_password_hash(password: str) -> str:
    # Simple hash for MVP - will use Supabase Auth later
    return hashlib.sha256(password.encode()).hexdigest()

# The placeholder default in config.py. Tokens signed with a publicly known
# key can be forged by anyone, so legacy tokens are refused until a real
# SECRET_KEY is configured.
_PLACEHOLDER_SECRET_KEYS = {"", "your-secret-key-change-in-production"}


def _legacy_secret_configured() -> bool:
    return settings.SECRET_KEY not in _PLACEHOLDER_SECRET_KEYS


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    if not _legacy_secret_configured():
        raise RuntimeError("SECRET_KEY is not configured; refusing to sign legacy tokens")
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    if not _legacy_secret_configured():
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None