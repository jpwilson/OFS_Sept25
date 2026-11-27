from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import or_, update
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Optional
from datetime import datetime, timedelta
from .database import get_db
from .security import decode_token
from .config import settings
from ..models.user import User

security = HTTPBearer()


LAST_LOGIN_EVERY = timedelta(hours=1)


def _update_last_login(user: User, db: Session):
    """Record "last seen" at most once an hour per user.

    A conditional UPDATE, so parallel requests from one page load write once: only the
    first finds last_login missing or older than an hour. Never logs the user."""
    now = datetime.utcnow()
    if user.last_login is not None and (now - user.last_login) <= LAST_LOGIN_EVERY:
        return
    try:
        db.execute(
            update(User)
            .where(User.id == user.id,
                   or_(User.last_login.is_(None), User.last_login < now - LAST_LOGIN_EVERY))
            .values(last_login=now)
            .execution_options(synchronize_session=False)
        )
        db.commit()
    except Exception:
        db.rollback()  # Don't let login tracking failures break auth


security_optional = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Unified auth dependency that supports both Supabase and legacy JWT tokens

    Tries Supabase token first, falls back to legacy token
    """
    import uuid

    token = credentials.credentials
    supabase_error = None

    # Logging rule: never log tokens, token claims, user ids or emails here (this
    # runs on every request). Log only the outcome and the exception class.

    # Try Supabase JWT first
    if settings.SUPABASE_JWT_SECRET:
        try:
            # Try with audience check first
            try:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated"
                )
            except JWTError:
                # Fall back to validation without audience check
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )

            # Supabase token validated - get user by auth_user_id
            auth_user_id_str = payload.get("sub")

            if auth_user_id_str:
                # Convert string UUID to uuid.UUID object for database query
                try:
                    auth_user_id = uuid.UUID(auth_user_id_str)
                except (ValueError, AttributeError):
                    # If conversion fails, fall back to legacy token
                    raise JWTError("Invalid UUID format in sub claim")

                user = db.query(User).filter(User.auth_user_id == auth_user_id).first()

                if user:
                    if user.is_active:
                        _update_last_login(user, db)
                        return user
                    else:
                        print("Auth: account is inactive")
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Account is inactive"
                        )
                else:
                    print("Auth: valid Supabase token but no user profile")

                    # Supabase token valid but user not found in our DB
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User profile not found. Please complete registration."
                    )
        except HTTPException:
            # Re-raise HTTP exceptions (user not found, account inactive)
            raise
        except JWTError as e:
            # Not a valid Supabase token, note the error class and try legacy
            supabase_error = type(e).__name__

    # Fallback to legacy token validation
    payload = decode_token(token)
    if payload is None:
        # Both Supabase and legacy validation failed
        if supabase_error:
            print(f"Auth: token rejected (Supabase check: {supabase_error})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    _update_last_login(user, db)
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional auth dependency - returns None if no token provided
    Useful for endpoints that work for both authenticated and anonymous users
    """
    if credentials is None:
        return None

    try:
        # Reuse the logic from get_current_user but return None on errors
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires the user to be a superuser.
    Returns 403 if user is not a superuser.
    """
    if not getattr(current_user, 'is_superuser', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    return current_user


def require_not_demo(
    current_user: User = Depends(get_current_user)
) -> User:
    """Block write operations for demo accounts."""
    if getattr(current_user, 'is_demo_account', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo accounts cannot perform this action. Sign up for your own account!"
        )
    return current_user