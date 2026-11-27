from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import re

from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.invited_viewer import InvitedViewer
from ..services.email_service import send_viewer_invitation_email
from ..core.config import settings

router = APIRouter(prefix="/invitations", tags=["invitations"])

# Base URL for invite links
INVITE_BASE_URL = "https://www.ourfamilysocials.com"

# Invitation emails carry text the inviter writes, so they are capped to keep
# them from being used as an open email relay.
MAX_INVITATION_EMAILS_PER_DAY = 25
MAX_PERSONAL_MESSAGE_LENGTH = 500
MAX_INVITED_NAME_LENGTH = 100
_LINK_PATTERN = re.compile(
    r"(https?://|www\.|\b[\w-]+\.(com|net|org|info|biz|io|co|ly|app|link|site|online|xyz|top|ru|cn|gl|uk)\b)",
    re.IGNORECASE
)


def contains_link(text: Optional[str]) -> bool:
    """True if the text contains a URL or something that looks like a web address."""
    return bool(text) and _LINK_PATTERN.search(text) is not None


def invitation_emails_sent_today(user_id: int, db: Session) -> int:
    """Email invitations this user created or re-sent in the last 24 hours."""
    since = datetime.utcnow() - timedelta(days=1)
    return db.query(InvitedViewer).filter(
        InvitedViewer.inviter_id == user_id,
        InvitedViewer.invited_email != None,
        (InvitedViewer.created_at >= since) | (InvitedViewer.last_sent_at >= since)
    ).count()


def check_invitation_email_quota(user_id: int, db: Session):
    if invitation_emails_sent_today(user_id, db) >= MAX_INVITATION_EMAILS_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail=f"You can send up to {MAX_INVITATION_EMAILS_PER_DAY} invitation emails a day. Please try again tomorrow."
        )


# ===== Schemas =====

class InvitationCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    personal_message: Optional[str] = None


class SignedUpUserInfo(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class InvitationResponse(BaseModel):
    id: int
    inviter_id: int
    invited_email: Optional[str] = None
    invited_name: Optional[str] = None
    status: str
    created_at: datetime
    signed_up_at: Optional[datetime] = None
    resulting_user: Optional[SignedUpUserInfo] = None
    resend_count: int = 0
    last_sent_at: Optional[datetime] = None
    resends_remaining: int = 2  # Computed field

    class Config:
        from_attributes = True


class EmailCheckResponse(BaseModel):
    # Only already_invited_by_me / my_invitation_id are filled in. The other
    # fields stay for older clients and are always empty: whether an address
    # has an account, or who else invited it, is not shown to members.
    exists_as_user: bool = False
    existing_user_username: Optional[str] = None
    already_invited_by_me: bool
    my_invitation_id: Optional[int] = None
    invited_by_others: List[str] = []


class InvitationListResponse(BaseModel):
    invitations: List[InvitationResponse]
    total: int


class InviteLinkResponse(BaseModel):
    token: str
    invite_url: str
    message: str


# ===== Endpoints =====

@router.post("/link", response_model=InviteLinkResponse)
def create_invite_link(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or retrieve a shareable invite link (no email required).
    This link can be shared via text, WhatsApp, etc.
    Each user gets one reusable link invite.
    """
    # Check if user already has an active link-based invite
    existing = db.query(InvitedViewer).filter(
        InvitedViewer.inviter_id == current_user.id,
        InvitedViewer.invited_email == None,  # Link-based invite (no email)
        InvitedViewer.status == 'pending'
    ).first()

    if existing:
        return InviteLinkResponse(
            token=existing.invite_token,
            invite_url=f"{INVITE_BASE_URL}/join/{existing.invite_token}",
            message="Retrieved existing invite link"
        )

    # Create new link-based invite
    invite_token = InvitedViewer.generate_token()
    new_invite = InvitedViewer(
        inviter_id=current_user.id,
        invited_email=None,  # No email for link invites
        invited_name=None,
        invite_token=invite_token,
        status='pending'
    )

    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    return InviteLinkResponse(
        token=invite_token,
        invite_url=f"{INVITE_BASE_URL}/join/{invite_token}",
        message="Created new invite link"
    )

@router.post("", response_model=InvitationResponse)
def create_invitation(
    invitation: InvitationCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new invitation to a non-user.
    Sends an email with signup link.
    """
    email_lower = invitation.email.lower()

    # The name and message go into an email to someone who is not a member:
    # short plain text only, no links
    if invitation.personal_message and len(invitation.personal_message) > MAX_PERSONAL_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Personal message is too long (max {MAX_PERSONAL_MESSAGE_LENGTH} characters)"
        )
    if invitation.name and len(invitation.name) > MAX_INVITED_NAME_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Name is too long (max {MAX_INVITED_NAME_LENGTH} characters)"
        )
    if contains_link(invitation.personal_message) or contains_link(invitation.name):
        raise HTTPException(
            status_code=400,
            detail="Links are not allowed in invitations. The email already includes the link to join."
        )

    # Check if this email already has a user account
    existing_user = db.query(User).filter(
        func.lower(User.email) == email_lower
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "USER_EXISTS",
                "message": "This email already has an account"
            }
        )

    # Check if I've already invited this email
    existing_invitation = db.query(InvitedViewer).filter(
        InvitedViewer.inviter_id == current_user.id,
        func.lower(InvitedViewer.invited_email) == email_lower,
        InvitedViewer.status == 'pending'
    ).first()

    if existing_invitation:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "ALREADY_INVITED",
                "message": "You've already invited this person",
                "invitation_id": existing_invitation.id
            }
        )

    check_invitation_email_quota(current_user.id, db)

    # Create the invitation
    invite_token = InvitedViewer.generate_token()
    new_invitation = InvitedViewer(
        inviter_id=current_user.id,
        invited_email=email_lower,
        invited_name=invitation.name,
        invite_token=invite_token,
        status='pending'
    )

    db.add(new_invitation)
    db.commit()
    db.refresh(new_invitation)

    # Send invitation email
    inviter_name = current_user.display_name or current_user.username
    invited_name = invitation.name or "Friend"

    background_tasks.add_task(
        send_viewer_invitation_email,
        to_email=email_lower,
        inviter_name=inviter_name,
        invited_name=invited_name,
        invite_token=invite_token,
        personal_message=invitation.personal_message
    )

    return new_invitation


@router.get("", response_model=InvitationListResponse)
def list_invitations(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all invitations sent by the current user.
    Optionally filter by status ('pending' or 'signed_up').
    """
    query = db.query(InvitedViewer).filter(
        InvitedViewer.inviter_id == current_user.id
    )

    if status:
        query = query.filter(InvitedViewer.status == status)

    invitations = query.order_by(InvitedViewer.created_at.desc()).all()

    # Build response with resulting user info
    MAX_RESENDS = 2
    invitation_responses = []
    for inv in invitations:
        resend_count = inv.resend_count or 0
        response = InvitationResponse(
            id=inv.id,
            inviter_id=inv.inviter_id,
            invited_email=inv.invited_email,
            invited_name=inv.invited_name,
            status=inv.status,
            created_at=inv.created_at,
            signed_up_at=inv.signed_up_at,
            resulting_user=None,
            resend_count=resend_count,
            last_sent_at=inv.last_sent_at,
            resends_remaining=max(0, MAX_RESENDS - resend_count)
        )

        # If they signed up, get their user info
        if inv.resulting_user_id:
            resulting_user = db.query(User).filter(User.id == inv.resulting_user_id).first()
            if resulting_user:
                response.resulting_user = SignedUpUserInfo(
                    id=resulting_user.id,
                    username=resulting_user.username,
                    display_name=resulting_user.display_name,
                    avatar_url=resulting_user.avatar_url
                )

        invitation_responses.append(response)

    return InvitationListResponse(
        invitations=invitation_responses,
        total=len(invitation_responses)
    )


@router.get("/check-email", response_model=EmailCheckResponse)
def check_email(
    email: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check whether I have already invited this email (pending).
    Nothing about other members or other inviters is returned.
    """
    email_lower = email.lower()

    # Check if I've already invited this email
    my_invitation = db.query(InvitedViewer).filter(
        InvitedViewer.inviter_id == current_user.id,
        func.lower(InvitedViewer.invited_email) == email_lower,
        InvitedViewer.status == 'pending'
    ).first()

    return EmailCheckResponse(
        already_invited_by_me=my_invitation is not None,
        my_invitation_id=my_invitation.id if my_invitation else None
    )


@router.delete("/{invitation_id}")
def cancel_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a pending invitation.
    Only the inviter can cancel their own invitations.
    """
    invitation = db.query(InvitedViewer).filter(
        InvitedViewer.id == invitation_id,
        InvitedViewer.inviter_id == current_user.id
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status == 'signed_up':
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel - this person has already signed up"
        )

    db.delete(invitation)
    db.commit()

    return {"message": "Invitation cancelled"}


@router.post("/{invitation_id}/resend")
def resend_invitation(
    invitation_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resend an invitation email.
    Only for pending invitations.
    Maximum 2 resends allowed (3 total sends).
    """
    MAX_RESENDS = 2  # 3 total sends: initial + 2 resends

    invitation = db.query(InvitedViewer).filter(
        InvitedViewer.id == invitation_id,
        InvitedViewer.inviter_id == current_user.id
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if invitation.status == 'signed_up':
        raise HTTPException(
            status_code=400,
            detail="Cannot resend - this person has already signed up"
        )

    # Check resend limit
    current_resend_count = invitation.resend_count or 0
    if current_resend_count >= MAX_RESENDS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum resends reached. You can only send {MAX_RESENDS + 1} emails per invitation."
        )

    check_invitation_email_quota(current_user.id, db)

    # Resend email
    inviter_name = current_user.display_name or current_user.username
    invited_name = invitation.invited_name or "Friend"

    background_tasks.add_task(
        send_viewer_invitation_email,
        to_email=invitation.invited_email,
        inviter_name=inviter_name,
        invited_name=invited_name,
        invite_token=invitation.invite_token,
        personal_message=None
    )

    # Update resend count and timestamp
    invitation.resend_count = current_resend_count + 1
    invitation.last_sent_at = datetime.utcnow()
    db.commit()

    remaining = MAX_RESENDS - invitation.resend_count
    if remaining > 0:
        return {"message": f"Invitation resent! ({remaining} resend{'s' if remaining > 1 else ''} remaining)"}
    else:
        return {"message": "Invitation resent! (no more resends available)"}


@router.get("/{invitation_id}", response_model=InvitationResponse)
def get_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific invitation by ID"""
    invitation = db.query(InvitedViewer).filter(
        InvitedViewer.id == invitation_id,
        InvitedViewer.inviter_id == current_user.id
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    return invitation
