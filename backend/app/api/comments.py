from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user, get_current_user_optional
from ..models.user import User
from ..models.event import Event
from ..models.comment import Comment
from ..models.comment_reaction import CommentReaction, REACTION_TYPES
from ..services.email_service import send_new_comment_email

router = APIRouter(prefix="/events", tags=["comments"])

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None

class ReactionCreate(BaseModel):
    reaction_type: str = 'heart'

class CommentResponse(BaseModel):
    id: int
    event_id: int
    author_id: int
    author_username: str
    author_full_name: Optional[str] = None
    author_display_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    content: str
    created_at: datetime
    parent_id: Optional[int] = None
    depth: int = 0
    reaction_count: int = 0
    reaction_counts: Dict[str, int] = {}
    user_reaction: Optional[str] = None

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

    # Handle threading
    depth = 0
    parent_id = None
    if comment.parent_id:
        parent = db.query(Comment).filter(Comment.id == comment.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if parent.event_id != event_id:
            raise HTTPException(status_code=400, detail="Parent comment belongs to a different event")
        if parent.depth >= 2:
            raise HTTPException(status_code=400, detail="Reply depth limit reached (max 3 levels)")
        depth = parent.depth + 1
        parent_id = parent.id

    # Create comment
    new_comment = Comment(
        event_id=event_id,
        author_id=current_user.id,
        content=comment.content,
        parent_id=parent_id,
        depth=depth
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
        author_display_name=current_user.display_name,
        author_avatar_url=current_user.avatar_url,
        content=new_comment.content,
        created_at=new_comment.created_at,
        parent_id=new_comment.parent_id,
        depth=new_comment.depth,
        reaction_count=0,
        reaction_counts={},
        user_reaction=None
    )

@router.get("/{event_id}/comments", response_model=List[CommentResponse])
def get_comments(
    event_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get all comments for an event with reaction data"""
    comments = db.query(Comment).filter(Comment.event_id == event_id).order_by(Comment.created_at.asc()).all()

    # Get reaction counts for all comments in one query
    comment_ids = [c.id for c in comments]
    reaction_counts_query = db.query(
        CommentReaction.comment_id,
        CommentReaction.reaction_type,
        func.count(CommentReaction.id).label('count')
    ).filter(CommentReaction.comment_id.in_(comment_ids)).group_by(
        CommentReaction.comment_id, CommentReaction.reaction_type
    ).all()

    # Build reaction counts dict
    reaction_counts_map = {}
    for row in reaction_counts_query:
        if row.comment_id not in reaction_counts_map:
            reaction_counts_map[row.comment_id] = {}
        reaction_counts_map[row.comment_id][row.reaction_type] = row.count

    # Get user's reactions if logged in
    user_reactions_map = {}
    if current_user:
        user_reactions = db.query(CommentReaction).filter(
            CommentReaction.comment_id.in_(comment_ids),
            CommentReaction.user_id == current_user.id
        ).all()
        for reaction in user_reactions:
            user_reactions_map[reaction.comment_id] = reaction.reaction_type

    return [
        CommentResponse(
            id=comment.id,
            event_id=comment.event_id,
            author_id=comment.author_id,
            author_username=comment.author.username,
            author_full_name=comment.author.full_name,
            author_display_name=comment.author.display_name,
            author_avatar_url=comment.author.avatar_url,
            content=comment.content,
            created_at=comment.created_at,
            parent_id=comment.parent_id,
            depth=comment.depth if comment.depth else 0,
            reaction_count=sum(reaction_counts_map.get(comment.id, {}).values()),
            reaction_counts=reaction_counts_map.get(comment.id, {}),
            user_reaction=user_reactions_map.get(comment.id)
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


# Comment Reactions
@router.post("/{event_id}/comments/{comment_id}/reactions")
def react_to_comment(
    event_id: int,
    comment_id: int,
    reaction: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add or update a reaction on a comment"""
    # Validate reaction type
    if reaction.reaction_type not in REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid reaction type. Must be one of: {REACTION_TYPES}")

    # Check comment exists and belongs to this event
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.event_id == event_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check if user already has a reaction
    existing = db.query(CommentReaction).filter(
        CommentReaction.comment_id == comment_id,
        CommentReaction.user_id == current_user.id
    ).first()

    if existing:
        if existing.reaction_type == reaction.reaction_type:
            return {"message": "Already reacted with this type", "reaction_type": existing.reaction_type}
        # Update reaction type
        existing.reaction_type = reaction.reaction_type
        db.commit()
        return {"message": "Reaction updated", "reaction_type": reaction.reaction_type}

    # Create new reaction
    new_reaction = CommentReaction(
        comment_id=comment_id,
        user_id=current_user.id,
        reaction_type=reaction.reaction_type
    )
    db.add(new_reaction)
    db.commit()

    return {"message": "Reaction added", "reaction_type": reaction.reaction_type}


@router.delete("/{event_id}/comments/{comment_id}/reactions")
def remove_comment_reaction(
    event_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove user's reaction from a comment"""
    # Check comment exists and belongs to this event
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.event_id == event_id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Delete the reaction
    reaction = db.query(CommentReaction).filter(
        CommentReaction.comment_id == comment_id,
        CommentReaction.user_id == current_user.id
    ).first()

    if reaction:
        db.delete(reaction)
        db.commit()

    return {"message": "Reaction removed"}
