from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from .database import get_db
from .security import decode_token
from .config import settings
from ..models.user import User

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Unified auth dependency that supports both Supabase and legacy JWT tokens

    Tries Supabase token first, falls back to legacy token
    """
    token = credentials.credentials
    supabase_error = None

    # Try Supabase JWT first
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )

            # Supabase token validated - get user by auth_user_id
            auth_user_id = payload.get("sub")
            if auth_user_id:
                user = db.query(User).filter(User.auth_user_id == auth_user_id).first()
                if user:
                    if user.is_active:
                        return user
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Account is inactive"
                        )
                else:
                    # Supabase token valid but user not found in our DB
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User profile not found. Please complete registration."
                    )
        except HTTPException:
            # Re-raise HTTP exceptions (user not found, account inactive)
            raise
        except JWTError as e:
            # Not a valid Supabase token, save error and try legacy
            supabase_error = str(e)
            pass

    # Fallback to legacy token validation
    payload = decode_token(token)
    if payload is None:
        # Both Supabase and legacy validation failed
        if supabase_error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token validation failed. Supabase error: {supabase_error}"
            )
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
    return user