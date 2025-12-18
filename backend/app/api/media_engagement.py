from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user, get_current_user_optional
from ..models.user import User
from ..models.event_image import EventImage
from ..models.media_like import MediaLike
from ..models.media_comment import MediaComment

router = APIRouter(prefix="/media", tags=["media-engagement"])

# ============ Schemas ============

class MediaLikeResponse(BaseModel):
    id: int
    event_image_id: int
    user_id: int
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class MediaLikeStats(BaseModel):
    like_count: int
    is_liked: bool
    recent_likes: List[MediaLikeResponse]

class MediaCommentCreate(BaseModel):
    content: str

class MediaCommentResponse(BaseModel):
    id: int
    event_image_id: int
    author_id: int
    author_username: str
    author_display_name: Optional[str]
    author_avatar_url: Optional[str]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class BatchMediaLikeStats(BaseModel):
    media_id: int
    like_count: int
    is_liked: bool

# ============ Like Endpoints ============

@router.post("/{media_id}/likes")
def like_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like a media item (image/video)"""
    # Check if media exists
    media = db.query(EventImage).filter(EventImage.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Check if already liked
    existing_like = db.query(MediaLike).filter(
        MediaLike.event_image_id == media_id,
        MediaLike.user_id == current_user.id
    ).first()

    if existing_like:
        return {"message": "Already liked", "liked": True}

    # Create like
    new_like = MediaLike(
        event_image_id=media_id,
        user_id=current_user.id
    )

    db.add(new_like)
    db.commit()

    return {"message": "Media liked", "liked": True}

@router.delete("/{media_id}/likes")
def unlike_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlike a media item"""
    like = db.query(MediaLike).filter(
        MediaLike.event_image_id == media_id,
        MediaLike.user_id == current_user.id
    ).first()

    if not like:
        return {"message": "Not liked", "liked": False}

    db.delete(like)
    db.commit()

    return {"message": "Media unliked", "liked": False}

@router.get("/{media_id}/likes", response_model=MediaLikeStats)
def get_media_likes(
    media_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get likes for a media item"""
    # Get all likes
    likes = db.query(MediaLike).filter(
        MediaLike.event_image_id == media_id
    ).order_by(MediaLike.created_at.desc()).all()

    # Check if current user liked
    is_liked = False
    if current_user:
        is_liked = any(like.user_id == current_user.id for like in likes)

    # Get recent likes with user info (limit to 5)
    recent_likes = [
        MediaLikeResponse(
            id=like.id,
            event_image_id=like.event_image_id,
            user_id=like.user_id,
            username=like.user.username,
            display_name=like.user.display_name,
            avatar_url=like.user.avatar_url,
            created_at=like.created_at
        )
        for like in likes[:5]
    ]

    return MediaLikeStats(
        like_count=len(likes),
        is_liked=is_liked,
        recent_likes=recent_likes
    )

@router.get("/batch/likes", response_model=List[BatchMediaLikeStats])
def get_batch_media_likes(
    ids: str = Query(..., description="Comma-separated list of media IDs"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get like stats for multiple media items at once (for efficient loading)"""
    try:
        media_ids = [int(id.strip()) for id in ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid media IDs format")

    if not media_ids:
        return []

    if len(media_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 media IDs per request")

    results = []
    for media_id in media_ids:
        likes = db.query(MediaLike).filter(
            MediaLike.event_image_id == media_id
        ).all()

        is_liked = False
        if current_user:
            is_liked = any(like.user_id == current_user.id for like in likes)

        results.append(BatchMediaLikeStats(
            media_id=media_id,
            like_count=len(likes),
            is_liked=is_liked
        ))

    return results

# ============ Comment Endpoints ============

@router.post("/{media_id}/comments", response_model=MediaCommentResponse)
def create_media_comment(
    media_id: int,
    comment_data: MediaCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a media item"""
    # Check if media exists
    media = db.query(EventImage).filter(EventImage.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Validate content
    if not comment_data.content or not comment_data.content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")

    if len(comment_data.content) > 1000:
        raise HTTPException(status_code=400, detail="Comment too long (max 1000 characters)")

    # Create comment
    new_comment = MediaComment(
        event_image_id=media_id,
        author_id=current_user.id,
        content=comment_data.content.strip()
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return MediaCommentResponse(
        id=new_comment.id,
        event_image_id=new_comment.event_image_id,
        author_id=new_comment.author_id,
        author_username=current_user.username,
        author_display_name=current_user.display_name,
        author_avatar_url=current_user.avatar_url,
        content=new_comment.content,
        created_at=new_comment.created_at
    )

@router.get("/{media_id}/comments", response_model=List[MediaCommentResponse])
def get_media_comments(
    media_id: int,
    db: Session = Depends(get_db)
):
    """Get all comments for a media item"""
    comments = db.query(MediaComment).filter(
        MediaComment.event_image_id == media_id
    ).order_by(MediaComment.created_at.asc()).all()

    return [
        MediaCommentResponse(
            id=comment.id,
            event_image_id=comment.event_image_id,
            author_id=comment.author_id,
            author_username=comment.author.username,
            author_display_name=comment.author.display_name,
            author_avatar_url=comment.author.avatar_url,
            content=comment.content,
            created_at=comment.created_at
        )
        for comment in comments
    ]

@router.delete("/{media_id}/comments/{comment_id}")
def delete_media_comment(
    media_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (only author can delete)"""
    comment = db.query(MediaComment).filter(
        MediaComment.id == comment_id,
        MediaComment.event_image_id == media_id
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted"}
