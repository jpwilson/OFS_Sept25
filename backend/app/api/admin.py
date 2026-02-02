from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc, case
from typing import Optional, Literal
from pydantic import BaseModel
from ..core.database import get_db
from ..core.deps import get_current_superuser
from ..models.user import User
from ..models.event import Event
from ..models.feedback import Feedback
from ..models.event_image import EventImage
from ..models.comment import Comment
from ..models.like import Like

router = APIRouter(prefix="/admin", tags=["admin"])


# ========================================
# Pydantic Models
# ========================================

class SuperuserToggle(BaseModel):
    is_superuser: bool


class FeedbackUpdate(BaseModel):
    status: Optional[str] = None  # "new", "in_progress", "resolved", "closed"
    admin_notes: Optional[str] = None
    admin_reply: Optional[str] = None  # Reply visible to user


# ========================================
# Dashboard Stats
# ========================================

@router.get("/stats")
def get_admin_stats(
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics. Superuser only."""
    try:
        total_users = db.query(func.count(User.id)).scalar()
        total_events = db.query(func.count(Event.id)).filter(Event.is_deleted == False).scalar()
        published_events = db.query(func.count(Event.id)).filter(
            Event.is_published == True, Event.is_deleted == False
        ).scalar()
        total_feedback = db.query(func.count(Feedback.id)).scalar()
        new_feedback = db.query(func.count(Feedback.id)).filter(Feedback.status == "new").scalar()
        premium_users = db.query(func.count(User.id)).filter(
            User.subscription_tier.in_(['premium', 'family'])
        ).scalar()
        superusers = db.query(func.count(User.id)).filter(User.is_superuser == True).scalar()

        return {
            "total_users": total_users,
            "total_events": total_events,
            "published_events": published_events,
            "total_feedback": total_feedback,
            "new_feedback": new_feedback,
            "premium_users": premium_users,
            "superusers": superusers
        }
    except Exception as e:
        print(f"🔴 ADMIN STATS ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


# ========================================
# User Management
# ========================================

@router.get("/users")
def list_users(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """List all users with optional search. Superuser only."""
    query = db.query(User)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                User.full_name.ilike(search_term),
                User.display_name.ilike(search_term)
            )
        )

    total = query.count()

    # Apply sorting
    sort_column = getattr(User, sort_by, User.created_at)
    if sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    users = query.offset(skip).limit(limit).all()

    # Batch fetch event stats for all users
    user_ids = [u.id for u in users]

    # Get event counts and date ranges per user
    event_stats = db.query(
        Event.author_id,
        func.count(Event.id).label('event_count'),
        func.min(Event.event_date).label('earliest_event'),
        func.max(Event.event_date).label('latest_event')
    ).filter(
        Event.author_id.in_(user_ids),
        Event.is_deleted == False
    ).group_by(Event.author_id).all()

    # Create lookup dict
    stats_lookup = {
        stat.author_id: {
            'event_count': stat.event_count,
            'earliest_event': stat.earliest_event,
            'latest_event': stat.latest_event
        }
        for stat in event_stats
    }

    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "display_name": u.display_name,
                "full_name": u.full_name,
                "subscription_tier": u.subscription_tier,
                "subscription_status": u.subscription_status,
                "is_superuser": getattr(u, 'is_superuser', False) or False,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if getattr(u, 'last_login', None) else None,
                "event_count": stats_lookup.get(u.id, {}).get('event_count', 0),
                "earliest_event": stats_lookup.get(u.id, {}).get('earliest_event').isoformat() if stats_lookup.get(u.id, {}).get('earliest_event') else None,
                "latest_event": stats_lookup.get(u.id, {}).get('latest_event').isoformat() if stats_lookup.get(u.id, {}).get('latest_event') else None
            }
            for u in users
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.patch("/users/{user_id}/superuser")
def toggle_superuser(
    user_id: int,
    data: SuperuserToggle,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Toggle superuser status for a user. Superuser only."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent removing your own superuser status
    if target_user.id == current_user.id and not data.is_superuser:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove your own superuser status"
        )

    target_user.is_superuser = data.is_superuser
    db.commit()

    return {"message": f"User {target_user.username} superuser status: {data.is_superuser}"}


# ========================================
# Event Management
# ========================================

@router.get("/events")
def list_events(
    search: Optional[str] = None,
    include_deleted: bool = False,
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    status_filter: str = "all",
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """List all events with optional search. Superuser only."""
    query = db.query(Event)

    if not include_deleted:
        query = query.filter(Event.is_deleted == False)

    # Apply status filter
    if status_filter == "published":
        query = query.filter(Event.is_published == True)
    elif status_filter == "draft":
        query = query.filter(Event.is_published == False)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Event.title.ilike(search_term),
                Event.slug.ilike(search_term)
            )
        )

    total = query.count()

    # Apply sorting
    sort_column = getattr(Event, sort_by, Event.created_at)
    if sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    events = query.offset(skip).limit(limit).all()

    # Batch fetch stats for all events
    event_ids = [e.id for e in events]

    # Get media counts (photos and videos) per event
    media_stats = db.query(
        EventImage.event_id,
        func.sum(case((EventImage.media_type == 'image', 1), else_=0)).label('photo_count'),
        func.sum(case((EventImage.media_type == 'video', 1), else_=0)).label('video_count')
    ).filter(
        EventImage.event_id.in_(event_ids)
    ).group_by(EventImage.event_id).all()

    media_lookup = {
        stat.event_id: {
            'photo_count': stat.photo_count or 0,
            'video_count': stat.video_count or 0
        }
        for stat in media_stats
    }

    # Get comment counts per event
    comment_stats = db.query(
        Comment.event_id,
        func.count(Comment.id).label('comment_count')
    ).filter(
        Comment.event_id.in_(event_ids)
    ).group_by(Comment.event_id).all()

    comment_lookup = {stat.event_id: stat.comment_count for stat in comment_stats}

    # Get reaction counts per event (likes)
    reaction_stats = db.query(
        Like.event_id,
        func.count(Like.id).label('reaction_count')
    ).filter(
        Like.event_id.in_(event_ids)
    ).group_by(Like.event_id).all()

    reaction_lookup = {stat.event_id: stat.reaction_count for stat in reaction_stats}

    return {
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "slug": e.slug,
                "author_id": e.author_id,
                "creator_username": e.author.username if e.author else None,
                "privacy_level": e.privacy_level,
                "is_published": e.is_published,
                "is_deleted": e.is_deleted,
                "view_count": e.view_count,
                "event_date": e.event_date.isoformat() if e.event_date else None,
                "created_at": e.created_at.isoformat() if e.created_at else None,
                "photo_count": media_lookup.get(e.id, {}).get('photo_count', 0),
                "video_count": media_lookup.get(e.id, {}).get('video_count', 0),
                "comment_count": comment_lookup.get(e.id, 0),
                "reaction_count": reaction_lookup.get(e.id, 0)
            }
            for e in events
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.patch("/events/{event_id}/visibility")
def toggle_event_visibility(
    event_id: int,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Toggle event visibility (soft delete). Superuser only."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.is_deleted = not event.is_deleted
    db.commit()

    action = "hidden" if event.is_deleted else "restored"
    return {"message": f"Event '{event.title}' {action}", "is_deleted": event.is_deleted}


# ========================================
# Feedback Management
# ========================================

@router.get("/feedback")
def list_feedback(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """List all user feedback. Superuser only."""
    query = db.query(Feedback)

    if status_filter:
        query = query.filter(Feedback.status == status_filter)

    total = query.count()
    items = query.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "feedback": [
            {
                "id": f.id,
                "user_id": f.user_id,
                "username": f.user.username if f.user else None,
                "display_name": f.user.display_name or f.user.full_name if f.user else None,
                "email": f.user.email if f.user else None,
                "feedback_type": f.feedback_type,
                "message": f.message,
                "page_url": f.page_url,
                "status": f.status,
                "admin_notes": f.admin_notes,
                "admin_reply": getattr(f, 'admin_reply', None),
                "admin_reply_at": f.admin_reply_at.isoformat() if getattr(f, 'admin_reply_at', None) else None,
                "is_mobile": f.is_mobile,
                "attachment_url": f.attachment_url,
                "created_at": f.created_at.isoformat() if f.created_at else None
            }
            for f in items
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.patch("/feedback/{feedback_id}")
def update_feedback(
    feedback_id: int,
    data: FeedbackUpdate,
    current_user: User = Depends(get_current_superuser),
    db: Session = Depends(get_db)
):
    """Update feedback status, notes, or reply. Superuser only."""
    from datetime import datetime

    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    if data.status is not None:
        fb.status = data.status
    if data.admin_notes is not None:
        fb.admin_notes = data.admin_notes
    if data.admin_reply is not None:
        fb.admin_reply = data.admin_reply
        fb.admin_reply_at = datetime.utcnow()

    db.commit()
    return {"message": "Feedback updated", "id": fb.id, "status": fb.status}
