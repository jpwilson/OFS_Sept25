from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
from ..core.database import get_db
from ..core.deps import get_current_user, get_current_user_optional
from ..models.user import User
from ..models.event import Event
from ..schemas.event import ShareLinkCreate, ShareLinkResponse
from ..utils.privacy import can_view_event

router = APIRouter()

@router.post("/events/{event_id}/share", response_model=ShareLinkResponse)
def create_share_link(
    event_id: int,
    share_data: ShareLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a shareable link for an event

    The link bypasses privacy settings for the specified duration (1-5 days)
    """
    # Validate expiration days
    if share_data.expires_in_days < 1 or share_data.expires_in_days > 5:
        raise HTTPException(status_code=400, detail="Expiration must be between 1 and 5 days")

    # Get event
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.is_deleted == False
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Only author can create share links
    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event author can create share links")

    # Only allow sharing published events
    if not event.is_published:
        raise HTTPException(status_code=400, detail="Cannot share unpublished events")

    # Generate unique token
    share_token = secrets.token_urlsafe(32)

    # Calculate expiration
    expires_at = datetime.utcnow() + timedelta(days=share_data.expires_in_days)

    # Update event with share info
    event.share_token = share_token
    event.share_enabled = True
    event.share_expires_at = expires_at
    event.share_view_count = 0

    db.commit()
    db.refresh(event)

    # Build share URL (frontend will need to handle this route)
    share_url = f"/share/{share_token}"

    return {
        "share_token": share_token,
        "share_url": share_url,
        "expires_at": expires_at,
        "view_count": 0
    }

@router.delete("/events/{event_id}/share")
def delete_share_link(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable sharing for an event"""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.author_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.share_enabled = False
    event.share_token = None
    event.share_expires_at = None

    db.commit()

    return {"message": "Share link disabled"}

@router.get("/events/{event_id}/share", response_model=ShareLinkResponse)
def get_share_link(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get existing share link for an event"""
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.author_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.share_enabled or not event.share_token:
        raise HTTPException(status_code=404, detail="No active share link for this event")

    # Check if expired
    if event.share_expires_at and event.share_expires_at < datetime.utcnow():
        event.share_enabled = False
        db.commit()
        raise HTTPException(status_code=404, detail="Share link has expired")

    share_url = f"/share/{event.share_token}"

    return {
        "share_token": event.share_token,
        "share_url": share_url,
        "expires_at": event.share_expires_at,
        "view_count": event.share_view_count or 0
    }

@router.get("/share/{token}")
def view_shared_event(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """
    View an event via share link (bypasses privacy settings)

    This endpoint is accessible without authentication but can accept auth
    to provide personalized messages
    """
    # Find event by share token
    event = db.query(Event).filter(
        Event.share_token == token,
        Event.share_enabled == True,
        Event.is_published == True,
        Event.is_deleted == False
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    # Check if expired
    if event.share_expires_at and event.share_expires_at < datetime.utcnow():
        event.share_enabled = False
        db.commit()
        raise HTTPException(status_code=410, detail="Share link has expired")

    # Increment view count
    event.share_view_count = (event.share_view_count or 0) + 1
    event.view_count = (event.view_count or 0) + 1
    db.commit()

    # Build response with event details
    from ..api.events import build_event_dict
    event_data = build_event_dict(event)

    # Add share context
    share_context = {
        "is_shared_link": True,
        "expires_at": event.share_expires_at.isoformat() if event.share_expires_at else None,
        "author_username": event.author.username,
        "author_full_name": event.author.full_name
    }

    # Add viewer context
    if current_user:
        # Check if already following
        from ..models.follow import Follow
        follow = db.query(Follow).filter(
            Follow.follower_id == current_user.id,
            Follow.following_id == event.author_id,
            Follow.status == "accepted"
        ).first()

        if follow:
            share_context["viewer_status"] = "following"
            share_context["message"] = "Shared link (you already follow this user)"
        elif current_user.id == event.author_id:
            share_context["viewer_status"] = "author"
            share_context["message"] = "This is your event"
        else:
            share_context["viewer_status"] = "logged_in_not_following"
            share_context["message"] = f"Follow @{event.author.username} to permanently access their events"
    else:
        share_context["viewer_status"] = "anonymous"
        share_context["message"] = f"Sign up to follow @{event.author.username} and see more events"

    return {
        "event": event_data,
        "share_context": share_context
    }
