from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.event import Event
from ..models.share_token import ShareToken
from ..services.email_service import send_event_share_email

router = APIRouter(prefix="/email", tags=["email"])


class ShareEventRequest(BaseModel):
    event_id: int
    recipient_email: EmailStr
    personal_message: Optional[str] = None


class ShareEventResponse(BaseModel):
    success: bool
    message: str
    share_url: Optional[str] = None


class ShareTokenResponse(BaseModel):
    token: str
    share_url: str
    expires_at: datetime


@router.post("/share-event", response_model=ShareEventResponse)
def share_event_via_email(
    request: ShareEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Share an event with someone via email"""

    # Get the event
    event = db.query(Event).filter(Event.id == request.event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Check if user owns the event
    if event.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only share your own events"
        )

    # Create a share token
    share_token = ShareToken.create_for_event(
        event_id=event.id,
        user_id=current_user.id,
        days_valid=7,
        sent_to_email=request.recipient_email
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)

    # Build share URL
    share_url = f"https://www.ourfamilysocials.com/shared/{share_token.token}"

    # Send email
    from_name = current_user.display_name or current_user.username
    result = send_event_share_email(
        to_email=request.recipient_email,
        from_name=from_name,
        event_title=event.title,
        share_url=share_url,
        personal_message=request.personal_message
    )

    if "error" in result and result["error"] != "No API key configured":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {result['error']}"
        )

    return ShareEventResponse(
        success=True,
        message=f"Event shared with {request.recipient_email}",
        share_url=share_url
    )


@router.post("/create-share-link", response_model=ShareTokenResponse)
def create_share_link(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a shareable link for an event (without sending email)"""

    # Get the event
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Check if user owns the event
    if event.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only share your own events"
        )

    # Create a share token
    share_token = ShareToken.create_for_event(
        event_id=event.id,
        user_id=current_user.id,
        days_valid=7
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)

    share_url = f"https://www.ourfamilysocials.com/shared/{share_token.token}"

    return ShareTokenResponse(
        token=share_token.token,
        share_url=share_url,
        expires_at=share_token.expires_at
    )


@router.get("/validate-token/{token}")
def validate_share_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Validate a share token and return event info"""

    share_token = db.query(ShareToken).filter(ShareToken.token == token).first()

    if not share_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found"
        )

    if not share_token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This share link has expired"
        )

    # Record the view
    share_token.record_view()
    db.commit()

    # Get event info
    event = share_token.event
    creator = share_token.created_by

    return {
        "valid": True,
        "event_id": event.id,
        "event_title": event.title,
        "event_slug": event.slug,
        "creator_username": creator.username,
        "creator_display_name": creator.display_name,
        "expires_at": share_token.expires_at.isoformat()
    }
