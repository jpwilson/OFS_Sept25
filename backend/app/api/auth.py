from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..core.database import get_db
from ..core.security import verify_password, get_password_hash, create_access_token
from ..core.supabase_auth import validate_supabase_token
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )

    user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

# Supabase Auth Integration

class SupabaseProfileCreate(BaseModel):
    """Schema for creating user profile after Supabase signup"""
    username: str
    display_name: Optional[str] = None
    supabase_token: str  # Supabase JWT token


@router.post("/supabase/create-profile", response_model=UserResponse)
def create_supabase_profile(
    profile_data: SupabaseProfileCreate,
    db: Session = Depends(get_db)
):
    """
    Create user profile after Supabase Auth signup

    Flow:
    1. User signs up via Supabase Auth on frontend
    2. Frontend gets Supabase JWT token
    3. Frontend calls this endpoint to create profile in our database
    4. We link the profile to Supabase auth_user_id
    """
    # Validate Supabase token
    try:
        payload = validate_supabase_token(profile_data.supabase_token)
        auth_user_id = payload.get("sub")
        email = payload.get("email")

        if not auth_user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Supabase token"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Token validation failed: {str(e)}"
        )

    # Check if profile already exists
    existing_user = db.query(User).filter(
        (User.auth_user_id == auth_user_id) |
        (User.email == email) |
        (User.username == profile_data.username)
    ).first()

    if existing_user:
        if existing_user.auth_user_id == auth_user_id:
            # Profile already exists for this Supabase user
            return UserResponse.model_validate(existing_user)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already registered"
            )

    # Create new profile
    user = User(
        email=email,
        username=profile_data.username,
        display_name=profile_data.display_name or profile_data.username,
        auth_user_id=auth_user_id,
        hashed_password=None,  # No password for Supabase Auth users
        subscription_tier='free'
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)
