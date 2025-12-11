from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..core.database import get_db
from ..core.security import verify_password, get_password_hash, create_access_token
from ..core.supabase_auth import validate_supabase_token
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, UserResponse, Token
from ..services.email_service import send_welcome_email
from ..models.invited_viewer import InvitedViewer
from ..models.follow import Follow
from sqlalchemy import func

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
    invite_token: Optional[str] = None  # Optional invitation token


@router.post("/supabase/create-profile", response_model=UserResponse)
def create_supabase_profile(
    profile_data: SupabaseProfileCreate,
    background_tasks: BackgroundTasks,
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
    import uuid
    import traceback

    print("🔵 CREATE-PROFILE: Starting...")
    print(f"🔵 Username: {profile_data.username}")
    print(f"🔵 Display name: {profile_data.display_name}")

    # Validate Supabase token
    try:
        print("🔵 Validating Supabase token...")
        payload = validate_supabase_token(profile_data.supabase_token)
        auth_user_id_str = payload.get("sub")
        email = payload.get("email")

        print(f"🔵 Token valid! Auth user ID: {auth_user_id_str}")
        print(f"🔵 Email: {email}")

        if not auth_user_id_str or not email:
            print("🔴 Missing sub or email in token")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Supabase token - missing sub or email"
            )

        # Convert string UUID to uuid.UUID object
        try:
            auth_user_id = uuid.UUID(auth_user_id_str)
            print(f"🔵 Converted to UUID object: {auth_user_id}")
        except ValueError as e:
            print(f"🔴 Failed to convert auth_user_id to UUID: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid UUID format: {auth_user_id_str}"
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"🔴 Token validation error: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Token validation failed: {str(e)}"
        )

    # Check if profile already exists
    try:
        print("🔵 Checking if profile exists...")
        existing_user = db.query(User).filter(
            (User.auth_user_id == auth_user_id) |
            (User.email == email) |
            (User.username == profile_data.username)
        ).first()

        print(f"🔵 Existing user query result: {existing_user is not None}")

        if existing_user:
            if existing_user.auth_user_id == auth_user_id:
                # Profile already exists for this Supabase user
                print("🟢 Profile already exists, returning existing user")
                return UserResponse.model_validate(existing_user)
            else:
                print("🔴 Email or username already taken")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email or username already registered"
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"🔴 Database query error: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}"
        )

    # Create new profile
    try:
        from datetime import datetime, timedelta

        print("🔵 Creating new user profile...")

        # Set trial dates: 30 days from now
        trial_start = datetime.utcnow()
        trial_end = trial_start + timedelta(days=30)

        user = User(
            email=email,
            username=profile_data.username,
            display_name=profile_data.display_name or profile_data.username,
            auth_user_id=auth_user_id,
            hashed_password=None,  # No password for Supabase Auth users
            subscription_tier='free',
            subscription_status='trial',
            trial_start_date=trial_start,
            trial_end_date=trial_end
        )

        print("🔵 Adding user to session...")
        db.add(user)

        print("🔵 Committing to database...")
        db.commit()

        print("🔵 Refreshing user object...")
        db.refresh(user)

        print(f"🟢 Profile created successfully! User ID: {user.id}")

        # Process invitation token if provided
        invitations_processed = []
        if profile_data.invite_token:
            try:
                invitation = db.query(InvitedViewer).filter(
                    InvitedViewer.invite_token == profile_data.invite_token,
                    InvitedViewer.status == 'pending'
                ).first()

                if invitation:
                    # Mark user as invited viewer
                    user.is_invited_viewer = True

                    # Mark invitation as signed up
                    invitation.status = 'signed_up'
                    invitation.resulting_user_id = user.id
                    invitation.signed_up_at = datetime.utcnow()
                    invitations_processed.append(invitation)

                    print(f"🟢 Processed invitation from user {invitation.inviter_id}")
            except Exception as e:
                print(f"🟡 Failed to process invite token: {e}")

        # Also check for any other pending invitations to this email
        try:
            other_invitations = db.query(InvitedViewer).filter(
                func.lower(InvitedViewer.invited_email) == email.lower(),
                InvitedViewer.status == 'pending'
            ).all()

            for inv in other_invitations:
                if inv not in invitations_processed:
                    user.is_invited_viewer = True
                    inv.status = 'signed_up'
                    inv.resulting_user_id = user.id
                    inv.signed_up_at = datetime.utcnow()
                    invitations_processed.append(inv)
                    print(f"🟢 Found and processed additional invitation from user {inv.inviter_id}")
        except Exception as e:
            print(f"🟡 Failed to check other invitations: {e}")

        # Auto-create Follow relationships for all processed invitations
        for inv in invitations_processed:
            try:
                # Check if follow already exists
                existing_follow = db.query(Follow).filter(
                    Follow.follower_id == user.id,
                    Follow.following_id == inv.inviter_id
                ).first()

                if not existing_follow:
                    # Create auto-accepted follow (user follows their inviter)
                    follow = Follow(
                        follower_id=user.id,
                        following_id=inv.inviter_id,
                        status='accepted',
                        invited_viewer_follow=True,
                        invitation_id=inv.id
                    )
                    db.add(follow)
                    print(f"🟢 Created follow relationship: {user.id} -> {inv.inviter_id}")
            except Exception as e:
                print(f"🟡 Failed to create follow for invitation {inv.id}: {e}")

        # Commit invitation/follow changes
        if invitations_processed:
            db.commit()
            db.refresh(user)

        # Send welcome email
        try:
            background_tasks.add_task(
                send_welcome_email,
                to_email=email,
                username=profile_data.username
            )
            print(f"🟢 Welcome email queued for {email}")
        except Exception as e:
            print(f"🟡 Failed to queue welcome email: {e}")
            # Don't fail profile creation if email fails

        return UserResponse.model_validate(user)

    except Exception as e:
        print(f"🔴 Failed to create profile: {e}")
        print(traceback.format_exc())
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create profile: {str(e)}"
        )


class InviteValidationResponse(BaseModel):
    valid: bool
    inviter_name: Optional[str] = None
    inviter_username: Optional[str] = None
    invited_email: Optional[str] = None
    invited_name: Optional[str] = None
    message: Optional[str] = None


@router.get("/validate-invite/{token}", response_model=InviteValidationResponse)
def validate_invite_token(token: str, db: Session = Depends(get_db)):
    """
    Validate an invitation token.
    Returns inviter info if valid, used for pre-filling signup form.
    """
    invitation = db.query(InvitedViewer).filter(
        InvitedViewer.invite_token == token
    ).first()

    if not invitation:
        return InviteValidationResponse(
            valid=False,
            message="Invalid or expired invitation"
        )

    if invitation.status == 'signed_up':
        return InviteValidationResponse(
            valid=False,
            message="This invitation has already been used"
        )

    # Get inviter details
    inviter = db.query(User).filter(User.id == invitation.inviter_id).first()
    inviter_name = inviter.display_name or inviter.username if inviter else "Someone"
    inviter_username = inviter.username if inviter else None

    return InviteValidationResponse(
        valid=True,
        inviter_name=inviter_name,
        inviter_username=inviter_username,
        invited_email=invitation.invited_email,
        invited_name=invitation.invited_name
    )
