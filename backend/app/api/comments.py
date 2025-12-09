from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.event import Event
from ..models.comment import Comment
from ..services.email_service import send_new_comment_email

router = APIRouter(prefix="/events", tags=["comments"])

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    event_id: int
    author_id: int
    author_username: str
    author_full_name: str
    author_avatar_url: Optional[str]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/{event_id}/comments", response_model=CommentResponse)
def create_comment(
    event_id: int,
    comment: CommentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new comment on an event"""
    # Check if event exists
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Create comment
    new_comment = Comment(
        event_id=event_id,
        author_id=current_user.id,
        content=comment.content
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    # Send email notification to event author (if not commenting on own event)
    if event.author_id != current_user.id:
        event_author = db.query(User).filter(User.id == event.author_id).first()
        if event_author and event_author.email:
            # Check notification preferences
            should_notify = (
                (event_author.email_notifications_enabled is None or event_author.email_notifications_enabled) and
                (event_author.notify_new_comment is None or event_author.notify_new_comment)
            )
            if should_notify:
                commenter_name = current_user.display_name or current_user.full_name or current_user.username
                event_url = f"https://www.ourfamilysocials.com/event/{event.id}"
                background_tasks.add_task(
                    send_new_comment_email,
                    to_email=event_author.email,
                    event_author_name=event_author.display_name or event_author.username,
                    commenter_name=commenter_name,
                    event_title=event.title,
                    comment_preview=comment.content,
                    event_url=event_url
                )

    # Build response
    return CommentResponse(
        id=new_comment.id,
        event_id=new_comment.event_id,
        author_id=new_comment.author_id,
        author_username=current_user.username,
        author_full_name=current_user.full_name,
        author_avatar_url=current_user.avatar_url,
        content=new_comment.content,
        created_at=new_comment.created_at
    )

@router.get("/{event_id}/comments", response_model=List[CommentResponse])
def get_comments(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Get all comments for an event"""
    comments = db.query(Comment).filter(Comment.event_id == event_id).order_by(Comment.created_at.desc()).all()

    return [
        CommentResponse(
            id=comment.id,
            event_id=comment.event_id,
            author_id=comment.author_id,
            author_username=comment.author.username,
            author_full_name=comment.author.full_name,
            author_avatar_url=comment.author.avatar_url,
            content=comment.content,
            created_at=comment.created_at
        )
        for comment in comments
    ]

@router.delete("/{event_id}/comments/{comment_id}")
def delete_comment(
    event_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (only by comment author or event author)"""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.event_id == event_id
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check authorization
    event = db.query(Event).filter(Event.id == event_id).first()
    if comment.author_id != current_user.id and event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted successfully"}
