from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from ..core.database import get_db
from ..core.deps import get_current_user, get_current_user_optional
from ..models.user import User
from ..models.event import Event
from ..models.event_tag import EventTag
from ..models.tag_profile import TagProfile
from ..models.follow import Follow
from ..schemas.event_tag import (
    EventTagCreate,
    EventTagBulkCreate,
    EventTagResponse,
    TagRequestResponse,
    SearchableTagTarget
)

router = APIRouter(prefix="/events", tags=["event-tags"])


def build_tag_response(tag: EventTag, db: Session) -> EventTagResponse:
    """Build a complete tag response with user/profile details."""
    response = EventTagResponse(
        id=tag.id,
        event_id=tag.event_id,
        tagged_by_id=tag.tagged_by_id,
        status=tag.status,
        created_at=tag.created_at,
        tagged_user_id=tag.tagged_user_id,
        tag_profile_id=tag.tag_profile_id
    )

    if tag.tagged_user_id:
        user = db.query(User).filter(User.id == tag.tagged_user_id).first()
        if user:
            response.tagged_user_username = user.username
            response.tagged_user_display_name = user.display_name or user.full_name
            response.tagged_user_avatar_url = user.avatar_url
    elif tag.tag_profile_id:
        profile = db.query(TagProfile).filter(TagProfile.id == tag.tag_profile_id).first()
        if profile:
            response.tag_profile_name = profile.name
            response.tag_profile_photo_url = profile.photo_url
            response.tag_profile_relationship = profile.relationship_to_creator
            creator = db.query(User).filter(User.id == profile.created_by_id).first()
            if creator:
                response.tag_profile_created_by_username = creator.username

    return response


@router.get("/{event_id}/tags", response_model=List[EventTagResponse])
def get_event_tags(
    event_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get all tags for an event. Only accepted tags are returned for non-owners."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Filter by status - owners see all, others see only accepted
    query = db.query(EventTag).filter(EventTag.event_id == event_id)
    if not current_user or current_user.id != event.author_id:
        query = query.filter(EventTag.status == "accepted")

    tags = query.all()
    return [build_tag_response(tag, db) for tag in tags]


@router.post("/{event_id}/tags", response_model=List[EventTagResponse])
def add_event_tags(
    event_id: int,
    tags: EventTagBulkCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add tags to an event. Only the event owner can add tags.
    - User tags start as 'pending' and require approval
    - Tag profile tags are auto-accepted (no approval needed for non-users)
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    if event.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the event owner can add tags"
        )

    created_tags = []
    for tag_data in tags.tags:
        # Validate exactly one of user_id or profile_id is provided
        if (tag_data.user_id is None) == (tag_data.profile_id is None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each tag must have either user_id or profile_id, not both or neither"
            )

        # Check for existing tag
        existing_query = db.query(EventTag).filter(EventTag.event_id == event_id)
        if tag_data.user_id:
            existing = existing_query.filter(EventTag.tagged_user_id == tag_data.user_id).first()
        else:
            existing = existing_query.filter(EventTag.tag_profile_id == tag_data.profile_id).first()

        if existing:
            # Tag already exists, skip
            continue

        # Determine status
        if tag_data.user_id:
            # User tags require approval (pending)
            # But if the user is tagging themselves, auto-accept
            status = "accepted" if tag_data.user_id == current_user.id else "pending"

            # Verify user exists
            tagged_user = db.query(User).filter(User.id == tag_data.user_id).first()
            if not tagged_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with id {tag_data.user_id} not found"
                )

            new_tag = EventTag(
                event_id=event_id,
                tagged_user_id=tag_data.user_id,
                tagged_by_id=current_user.id,
                status=status
            )

            # TODO: Send notification email if user has notify_tag_request enabled
            # and this is a pending tag
        else:
            # Tag profile tags are auto-accepted
            status = "accepted"

            # Verify profile exists
            profile = db.query(TagProfile).filter(TagProfile.id == tag_data.profile_id).first()
            if not profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tag profile with id {tag_data.profile_id} not found"
                )

            new_tag = EventTag(
                event_id=event_id,
                tag_profile_id=tag_data.profile_id,
                tagged_by_id=current_user.id,
                status=status
            )

        db.add(new_tag)
        db.flush()  # Get the ID without committing
        created_tags.append(new_tag)

    db.commit()

    return [build_tag_response(tag, db) for tag in created_tags]


@router.delete("/{event_id}/tags/{tag_id}")
def remove_event_tag(
    event_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a tag from an event.
    Event owner can remove any tag.
    Tagged user can remove their own tag (reject it).
    """
    tag = db.query(EventTag).filter(
        EventTag.id == tag_id,
        EventTag.event_id == event_id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found"
        )

    event = db.query(Event).filter(Event.id == event_id).first()

    # Check permissions
    can_delete = (
        event.author_id == current_user.id or  # Event owner
        tag.tagged_user_id == current_user.id  # Tagged user themselves
    )

    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove this tag"
        )

    db.delete(tag)
    db.commit()

    return {"message": "Tag removed"}


# Tag request management endpoints (for tagged users)
tag_requests_router = APIRouter(prefix="/me", tags=["tag-requests"])


@tag_requests_router.get("/tag-requests", response_model=List[TagRequestResponse])
def get_my_tag_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending tag requests for the current user."""
    tags = db.query(EventTag).filter(
        EventTag.tagged_user_id == current_user.id,
        EventTag.status == "pending"
    ).order_by(EventTag.created_at.desc()).all()

    results = []
    for tag in tags:
        event = db.query(Event).filter(Event.id == tag.event_id).first()
        tagged_by = db.query(User).filter(User.id == tag.tagged_by_id).first()

        if event and tagged_by:
            results.append(TagRequestResponse(
                id=tag.id,
                event_id=tag.event_id,
                event_title=event.title,
                event_cover_image_url=event.cover_image_url,
                tagged_by_id=tag.tagged_by_id,
                tagged_by_username=tagged_by.username,
                tagged_by_display_name=tagged_by.display_name or tagged_by.full_name,
                tagged_by_avatar_url=tagged_by.avatar_url,
                status=tag.status,
                created_at=tag.created_at
            ))

    return results


@tag_requests_router.get("/tag-requests/count")
def get_tag_request_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of pending tag requests for notification badges."""
    count = db.query(EventTag).filter(
        EventTag.tagged_user_id == current_user.id,
        EventTag.status == "pending"
    ).count()

    return {"count": count}


@tag_requests_router.post("/tag-requests/{tag_id}/accept")
def accept_tag_request(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a tag request."""
    tag = db.query(EventTag).filter(
        EventTag.id == tag_id,
        EventTag.tagged_user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag request not found"
        )

    if tag.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This tag request has already been processed"
        )

    tag.status = "accepted"
    db.commit()

    return {"message": "Tag accepted"}


@tag_requests_router.post("/tag-requests/{tag_id}/reject")
def reject_tag_request(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a tag request."""
    tag = db.query(EventTag).filter(
        EventTag.id == tag_id,
        EventTag.tagged_user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag request not found"
        )

    if tag.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This tag request has already been processed"
        )

    tag.status = "rejected"
    db.commit()

    return {"message": "Tag rejected"}


@tag_requests_router.get("/tagged-events")
def get_tagged_events(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all events where the current user is tagged (accepted tags only)."""
    tagged_event_ids = db.query(EventTag.event_id).filter(
        EventTag.tagged_user_id == current_user.id,
        EventTag.status == "accepted"
    ).subquery()

    events = db.query(Event).filter(
        Event.id.in_(tagged_event_ids),
        Event.is_published == True,
        Event.is_deleted == False
    ).order_by(Event.start_date.desc()).offset(skip).limit(limit).all()

    results = []
    for event in events:
        author = event.author
        results.append({
            "id": event.id,
            "title": event.title,
            "summary": event.summary,
            "start_date": event.start_date.isoformat() if event.start_date else None,
            "cover_image_url": event.cover_image_url,
            "author_id": event.author_id,
            "author_username": author.username if author else None,
            "author_display_name": author.display_name or author.full_name if author else None
        })

    return results


# Combined search endpoint for tagging UI
search_router = APIRouter(prefix="/search", tags=["tag-search"])


@search_router.get("/taggable", response_model=List[SearchableTagTarget])
def search_taggable(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for both users and tag profiles that can be tagged.
    Returns combined results with type indicator.
    Prioritizes:
    1. Users the current user follows
    2. Tag profiles created by people the current user follows
    3. Other matching results
    """
    if not q or len(q) < 1:
        return []

    search_term = f"%{q}%"
    results = []

    # Get IDs of users the current user follows
    following_ids = [f.following_id for f in db.query(Follow.following_id).filter(
        Follow.follower_id == current_user.id,
        Follow.status == "accepted"
    ).all()]

    # Search users
    users = db.query(User).filter(
        or_(
            User.username.ilike(search_term),
            User.display_name.ilike(search_term),
            User.full_name.ilike(search_term)
        ),
        User.id != current_user.id  # Don't include self
    ).limit(10).all()

    for user in users:
        # Check if this user is followed
        is_followed = user.id in following_ids

        results.append(SearchableTagTarget(
            type="user",
            id=user.id,
            name=user.display_name or user.full_name or user.username,
            display_name=user.display_name or user.full_name,
            photo_url=user.avatar_url,
            username=user.username
        ))

    # Search tag profiles
    profiles = db.query(TagProfile).join(
        User, TagProfile.created_by_id == User.id
    ).filter(
        TagProfile.name.ilike(search_term),
        TagProfile.is_merged == False
    ).limit(10).all()

    for profile in profiles:
        creator = db.query(User).filter(User.id == profile.created_by_id).first()
        results.append(SearchableTagTarget(
            type="profile",
            id=profile.id,
            name=profile.name,
            photo_url=profile.photo_url,
            relationship_to_creator=profile.relationship_to_creator,
            created_by_username=creator.username if creator else None
        ))

    # Sort: followed users/profiles first
    def sort_key(item):
        if item.type == "user":
            return (0 if item.id in following_ids else 1, item.name.lower())
        else:
            # For profiles, check if creator is followed
            creator = db.query(User).filter(User.username == item.created_by_username).first()
            is_creator_followed = creator and creator.id in following_ids
            return (0 if is_creator_followed else 1, item.name.lower())

    results.sort(key=sort_key)

    return results[:20]  # Limit total results
