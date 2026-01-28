from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Optional
from .database import get_db
from .security import decode_token
from .config import settings
from ..models.user import User

security = HTTPBearer()
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
    import traceback

    token = credentials.credentials
    supabase_error = None

    print(f"🔵 GET_CURRENT_USER: Starting authentication")
    print(f"🔵 Token length: {len(token)}")

    # Try Supabase JWT first
    if settings.SUPABASE_JWT_SECRET:
        try:
            print("🔵 Trying Supabase JWT validation...")
            # Try with audience check first
            try:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated"
                )
                print("🟢 Token validated with audience check")
            except JWTError as e:
                print(f"🟡 Audience check failed: {e}, trying without audience...")
                # Fall back to validation without audience check
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
                print("🟢 Token validated without audience check")

            # Supabase token validated - get user by auth_user_id
            auth_user_id_str = payload.get("sub")
            print(f"🔵 Auth user ID from token: {auth_user_id_str}")

            if auth_user_id_str:
                # Convert string UUID to uuid.UUID object for database query
                try:
                    auth_user_id = uuid.UUID(auth_user_id_str)
                    print(f"🔵 Converted to UUID object: {auth_user_id}")
                except (ValueError, AttributeError) as e:
                    print(f"🔴 UUID conversion failed: {e}")
                    # If conversion fails, fall back to legacy token
                    raise JWTError("Invalid UUID format in sub claim")

                print(f"🔵 Looking up user with auth_user_id: {auth_user_id}")
                user = db.query(User).filter(User.auth_user_id == auth_user_id).first()

                if user:
                    print(f"🟢 User found! ID: {user.id}, Username: {user.username}, Email: {user.email}")
                    if user.is_active:
                        print(f"🟢 User is active, returning user")
                        return user
                    else:
                        print(f"🔴 User account is inactive")
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Account is inactive"
                        )
                else:
                    print(f"🔴 User NOT found with auth_user_id: {auth_user_id}")
                    # Let's also check what users exist in the database
                    all_users_with_auth = db.query(User).filter(User.auth_user_id != None).all()
                    print(f"🔵 Total users with auth_user_id in database: {len(all_users_with_auth)}")
                    for u in all_users_with_auth[:10]:  # Print first 10 users with auth_user_id
                        print(f"  - User ID: {u.id}, Username: {u.username}, Email: {u.email}, auth_user_id: {u.auth_user_id}")

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