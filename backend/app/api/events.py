from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.event import Event
from ..models.content_block import ContentBlock
from ..schemas.event import EventCreate, EventUpdate, EventResponse, ContentBlockCreate, ContentBlockResponse

router = APIRouter(prefix="/events", tags=["events"])

@router.get("", response_model=List[EventResponse])
def get_events(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.is_published == True).order_by(Event.created_at.desc()).offset(skip).limit(limit).all()

    response = []
    for event in events:
        event_dict = {
            **event.__dict__,
            "author_username": event.author.username,
            "author_full_name": event.author.full_name,
            "like_count": len(event.likes),
            "comment_count": len(event.comments),
            "content_blocks": event.content_blocks
        }
        response.append(EventResponse.model_validate(event_dict))

    return response

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.view_count += 1
    db.commit()
    db.refresh(event)

    event_dict = {
        **event.__dict__,
        "author_username": event.author.username,
        "author_full_name": event.author.full_name,
        "like_count": len(event.likes),
        "comment_count": len(event.comments),
        "content_blocks": event.content_blocks
    }

    return EventResponse.model_validate(event_dict)

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Use authenticated user as the event author
    event_dict = event_data.model_dump()
    event = Event(
        **event_dict,
        author_id=current_user.id,
        is_published=True  # Auto-publish for now
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    event_dict = {
        **event.__dict__,
        "author_username": event.author.username,
        "author_full_name": event.author.full_name,
        "like_count": 0,
        "comment_count": 0,
        "content_blocks": []
    }

    return EventResponse.model_validate(event_dict)

@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    for key, value in event_data.model_dump(exclude_unset=True).items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)

    event_dict = {
        **event.__dict__,
        "author_username": event.author.username,
        "author_full_name": event.author.full_name,
        "like_count": len(event.likes),
        "comment_count": len(event.comments),
        "content_blocks": event.content_blocks
    }

    return EventResponse.model_validate(event_dict)

@router.post("/{event_id}/content", response_model=ContentBlockResponse)
def add_content_block(
    event_id: int,
    content_data: ContentBlockCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    content_block = ContentBlock(
        **content_data.model_dump(),
        event_id=event_id
    )

    db.add(content_block)
    db.commit()
    db.refresh(content_block)

    return ContentBlockResponse.model_validate(content_block)

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(event)
    db.commit()

    return {"message": "Event deleted"}

@router.post("/{event_id}/comments")
def add_comment(
    event_id: int,
    content: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..models.comment import Comment

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    comment = Comment(
        event_id=event_id,
        author_id=current_user.id,
        content=content
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {"id": comment.id, "content": comment.content, "created_at": comment.created_at}

@router.post("/{event_id}/like")
def add_like(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..models.like import Like

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if already liked
    existing_like = db.query(Like).filter(
        Like.event_id == event_id,
        Like.user_id == current_user.id
    ).first()

    if existing_like:
        return {"message": "Already liked"}

    like = Like(
        event_id=event_id,
        user_id=current_user.id
    )

    db.add(like)
    db.commit()

    return {"message": "Liked successfully"}