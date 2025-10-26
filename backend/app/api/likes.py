from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.event import Event
from ..models.like import Like

router = APIRouter(prefix="/events", tags=["likes"])

class LikeResponse(BaseModel):
    id: int
    event_id: int
    user_id: int
    username: str
    full_name: str
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class LikeStats(BaseModel):
    like_count: int
    is_liked: bool
    recent_likes: List[LikeResponse]

@router.post("/{event_id}/likes")
def like_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like an event"""
    # Check if event exists
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if already liked
    existing_like = db.query(Like).filter(
        Like.event_id == event_id,
        Like.user_id == current_user.id
    ).first()

    if existing_like:
        return {"message": "Already liked", "liked": True}

    # Create like
    new_like = Like(
        event_id=event_id,
        user_id=current_user.id
    )

    db.add(new_like)
    db.commit()

    return {"message": "Event liked", "liked": True}

@router.delete("/{event_id}/likes")
def unlike_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlike an event"""
    like = db.query(Like).filter(
        Like.event_id == event_id,
        Like.user_id == current_user.id
    ).first()

    if not like:
        return {"message": "Not liked", "liked": False}

    db.delete(like)
    db.commit()

    return {"message": "Event unliked", "liked": False}

@router.get("/{event_id}/likes", response_model=LikeStats)
def get_likes(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get likes for an event"""
    # Get all likes
    likes = db.query(Like).filter(Like.event_id == event_id).order_by(Like.created_at.desc()).all()

    # Check if current user liked
    is_liked = any(like.user_id == current_user.id for like in likes)

    # Get recent likes with user info (limit to 10 for performance)
    recent_likes = [
        LikeResponse(
            id=like.id,
            event_id=like.event_id,
            user_id=like.user_id,
            username=like.user.username,
            full_name=like.user.full_name,
            avatar_url=like.user.avatar_url,
            created_at=like.created_at
        )
        for like in likes[:10]
    ]

    return LikeStats(
        like_count=len(likes),
        is_liked=is_liked,
        recent_likes=recent_likes
    )

@router.get("/{event_id}/likes/all", response_model=List[LikeResponse])
def get_all_likes(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Get all likes for an event (for showing full list)"""
    likes = db.query(Like).filter(Like.event_id == event_id).order_by(Like.created_at.desc()).all()

    return [
        LikeResponse(
            id=like.id,
            event_id=like.event_id,
            user_id=like.user_id,
            username=like.user.username,
            full_name=like.user.full_name,
            avatar_url=like.user.avatar_url,
            created_at=like.created_at
        )
        for like in likes
    ]
