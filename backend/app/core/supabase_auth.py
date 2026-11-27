"""
Supabase Auth integration for validating Supabase-issued JWT tokens
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from typing import Optional
import requests

from .config import settings
from .database import get_db
from ..models.user import User

security = HTTPBearer()


def get_supabase_jwt_secret() -> str:
    """Get Supabase JWT secret for validating tokens"""
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Supabase JWT secret not configured"
        )
    return settings.SUPABASE_JWT_SECRET


def validate_supabase_token(token: str) -> dict:
    """
    Validate a Supabase-issued JWT token

    Returns the decoded payload if valid, raises HTTPException if invalid
    """
    # Logging rule: never log the token, its claims or the user id. Log only the
    # outcome and the exception class; clients get a generic message.
    try:
        # Try with audience check first
        try:
            payload = jwt.decode(
                token,
                get_supabase_jwt_secret(),
                algorithms=["HS256"],
                audience="authenticated"
            )
        except JWTError:
            # Fall back to validation without audience check
            payload = jwt.decode(
                token,
                get_supabase_jwt_secret(),
                algorithms=["HS256"],
                options={"verify_aud": False}  # Skip audience verification
            )

        # Check if token has required fields
        if "sub" not in payload:
            print("Supabase token rejected: missing sub claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        return payload

    except HTTPException:
        raise
    except JWTError as e:
        print(f"Supabase token rejected: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except Exception as e:
        print(f"Supabase token validation error: {type(e).__name__}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed"
        )


async def get_current_user_supabase(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from Supabase Auth token

    This validates the Supabase JWT and returns the corresponding user from our database
    """
    token = credentials.credentials

    # Validate Supabase token
    payload = validate_supabase_token(token)

    # Extract auth_user_id from token
    auth_user_id = payload.get("sub")

    if not auth_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID"
        )

    # Find user by auth_user_id
    user = db.query(User).filter(User.auth_user_id == auth_user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    return user


def get_supabase_user(token: str) -> Optional[dict]:
    """
    Get user info directly from Supabase Auth API

    Used during registration to verify email, etc.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return None

    try:
        response = requests.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}"
            }
        )

        if response.status_code == 200:
            return response.json()

        return None

    except Exception:
        return None
