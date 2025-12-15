from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.invited_viewer import InvitedViewer
from ..services.email_service import send_viewer_invitation_email
from ..core.config import settings

router = APIRouter(prefix="/invitations", tags=["invitations"])

# Base URL for invite links
INVITE_BASE_URL = "https://www.ourfamilysocials.com"


# ===== Schemas =====

class InvitationCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    personal_message: Optional[str] = None


class InvitationResponse(BaseModel):
    id: int
    inviter_id: int
    invited_email: str
    invited_name: Optional[str]
    status: str
    created_at: datetime
    signed_up_at: Optional[datetime]

    class Config:
        from_attributes = True


class EmailCheckResponse(BaseModel):
    exists_as_user: bool
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

    # Check if this email already has a user account
    existing_user = db.query(User).filter(
        func.lower(User.email) == email_lower
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "USER_EXISTS",
                "message": "This email already has an account",
                "username": existing_user.username
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

    return InvitationListResponse(
        invitations=invitations,
        total=len(invitations)
    )


@router.get("/check-email", response_model=EmailCheckResponse)
def check_email(
    email: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if an email already exists as a user or has been invited.
    Useful for showing appropriate UI before creating invitation.
    """
    email_lower = email.lower()

    # Check if email exists as user
    existing_user = db.query(User).filter(
        func.lower(User.email) == email_lower
    ).first()

    # Check if I've already invited this email
    my_invitation = db.query(InvitedViewer).filter(
        InvitedViewer.inviter_id == current_user.id,
        func.lower(InvitedViewer.invited_email) == email_lower,
        InvitedViewer.status == 'pending'
    ).first()

    # Check if others have invited this email
    other_invitations = db.query(InvitedViewer).join(
        User, InvitedViewer.inviter_id == User.id
    ).filter(
        func.lower(InvitedViewer.invited_email) == email_lower,
        InvitedViewer.inviter_id != current_user.id,
        InvitedViewer.status == 'pending'
    ).all()

    other_inviter_names = [
        inv.inviter.display_name or inv.inviter.username
        for inv in other_invitations
    ]

    return EmailCheckResponse(
        exists_as_user=existing_user is not None,
        existing_user_username=existing_user.username if existing_user else None,
        already_invited_by_me=my_invitation is not None,
        my_invitation_id=my_invitation.id if my_invitation else None,
        invited_by_others=other_inviter_names
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
            detail="Cannot resend - this person has already signed up"
        )

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

    return {"message": "Invitation resent"}


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
