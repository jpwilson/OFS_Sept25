from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..models.event import Event
from ..models.content_block import ContentBlock
from ..models.event_location import EventLocation
from ..schemas.event import EventCreate, EventUpdate, EventResponse, ContentBlockCreate, ContentBlockResponse
from ..utils.location_validator import validate_location_count, extract_location_markers

router = APIRouter(prefix="/events", tags=["events"])

@router.get("", response_model=List[EventResponse])
def get_events(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    try:
        print(f"DEBUG: Fetching events with skip={skip}, limit={limit}")
        from sqlalchemy.orm import joinedload
        events = db.query(Event).options(
            joinedload(Event.locations)
        ).filter(
            Event.is_published == True,
            Event.is_deleted == False
        ).order_by(Event.created_at.desc()).offset(skip).limit(limit).all()

        print(f"DEBUG: Found {len(events)} events")
        response = []
        for i, event in enumerate(events):
            try:
                print(f"DEBUG: Processing event {i+1}/{len(events)}: id={event.id}, title={event.title}")
                event_dict = {
                    **event.__dict__,
                    "author_username": event.author.username,
                    "author_full_name": event.author.full_name,
                    "like_count": len(event.likes),
                    "comment_count": len(event.comments),
                    "content_blocks": event.content_blocks,
                    "locations": event.locations if event.locations else []
                }
                response.append(EventResponse.model_validate(event_dict))
                print(f"DEBUG: Successfully processed event {event.id}")
            except Exception as e:
                print(f"ERROR: Failed to process event {event.id}: {e}")
                import traceback
                traceback.print_exc()
                # Skip this event and continue
                continue

        print(f"DEBUG: Successfully built response with {len(response)} events")
        return response
    except Exception as e:
        print(f"ERROR: Failed to fetch events: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events: {str(e)}"
        )

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,
    is_published: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check event limit for free users
    if current_user.subscription_tier == 'free':
        published_events_count = db.query(Event).filter(
            Event.author_id == current_user.id,
            Event.is_published == True,
            Event.is_deleted == False
        ).count()

        if published_events_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free plan limit reached. You can only create 5 events. Please upgrade to Premium for unlimited events."
            )

    # Validate location count if multiple locations enabled
    if event_data.has_multiple_locations and event_data.description:
        is_valid, location_count = validate_location_count(event_data.description)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Too many location markers. Found {location_count}, maximum allowed is 20. Please reduce the number of location markers in your content."
            )

    # Use authenticated user as the event author
    # Exclude gps_locations from event creation as it's handled separately
    event_dict = event_data.model_dump(exclude={'gps_locations'})
    event = Event(
        **event_dict,
        author_id=current_user.id,
        is_published=is_published
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    # Extract and save location markers from HTML content if multiple locations enabled
    if event.has_multiple_locations and event.description:
        location_markers = extract_location_markers(event.description)
        print(f"DEBUG: Extracted {len(location_markers)} location markers for event {event.id}")
        for marker in location_markers:
            event_location = EventLocation(
                event_id=event.id,
                location_name=marker['location_name'],
                latitude=marker['latitude'],
                longitude=marker['longitude'],
                location_type='inline_marker',
                timestamp=datetime.fromisoformat(marker['timestamp']) if marker.get('timestamp') else None,
                order_index=marker['order_index']
            )
            db.add(event_location)
            print(f"DEBUG: Added location: {marker['location_name']}")

        db.commit()
        print(f"DEBUG: Committed {len(location_markers)} locations to database")
    else:
        print(f"DEBUG: Skipping location extraction - has_multiple_locations={event.has_multiple_locations}, has_description={bool(event.description)}")

    # Save GPS-extracted locations from uploaded images
    if event.has_multiple_locations and event_data.gps_locations:
        print(f"DEBUG: Saving {len(event_data.gps_locations)} GPS-extracted locations")
        try:
            for idx, gps_loc in enumerate(event_data.gps_locations):
                # Convert EXIF timestamp format (YYYY:MM:DD HH:MM:SS) to ISO format
                timestamp = None
                if gps_loc.timestamp:
                    try:
                        # EXIF format: 2025:10:19 10:49:07 -> ISO: 2025-10-19T10:49:07
                        exif_timestamp = gps_loc.timestamp.replace(':', '-', 2).replace(' ', 'T')
                        timestamp = datetime.fromisoformat(exif_timestamp)
                    except (ValueError, AttributeError) as e:
                        print(f"DEBUG: Failed to parse timestamp '{gps_loc.timestamp}': {e}")
                        timestamp = None

                event_location = EventLocation(
                    event_id=event.id,
                    location_name=f"Photo location {idx + 1}",
                    latitude=gps_loc.latitude,
                    longitude=gps_loc.longitude,
                    location_type='exif',
                    timestamp=timestamp,
                    order_index=idx
                )
                db.add(event_location)
                print(f"DEBUG: Added GPS location: {gps_loc.latitude}, {gps_loc.longitude}")

            db.commit()
            print(f"DEBUG: Committed {len(event_data.gps_locations)} GPS locations to database")
        except Exception as e:
            print(f"ERROR: Failed to save GPS locations: {e}")
            import traceback
            traceback.print_exc()
            # Continue without GPS locations rather than failing the entire event creation
            db.rollback()

    # Refresh event to get updated locations
    db.refresh(event)

    try:
        event_dict = {
            **event.__dict__,
            "author_username": event.author.username,
            "author_full_name": event.author.full_name,
            "like_count": 0,
            "comment_count": 0,
            "content_blocks": [],
            "locations": event.locations if event.locations else []
        }

        print(f"DEBUG: Building response for event {event.id} with {len(event.locations) if event.locations else 0} locations")
        return EventResponse.model_validate(event_dict)
    except Exception as e:
        print(f"ERROR: Failed to build event response: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create event response: {str(e)}"
        )

@router.get("/drafts", response_model=List[EventResponse])
def get_user_drafts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's draft events"""
    from sqlalchemy.orm import joinedload
    drafts = db.query(Event).options(
        joinedload(Event.locations)
    ).filter(
        Event.author_id == current_user.id,
        Event.is_published == False,
        Event.is_deleted == False
    ).order_by(Event.updated_at.desc()).all()

    response = []
    for event in drafts:
        event_dict = {
            **event.__dict__,
            "author_username": event.author.username,
            "author_full_name": event.author.full_name,
            "like_count": len(event.likes),
            "comment_count": len(event.comments),
            "content_blocks": event.content_blocks,
            "locations": event.locations if event.locations else []
        }
        response.append(EventResponse.model_validate(event_dict))

    return response

@router.get("/trash", response_model=List[EventResponse])
def get_user_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's deleted events (trash)"""
    from sqlalchemy.orm import joinedload
    trash = db.query(Event).options(
        joinedload(Event.locations)
    ).filter(
        Event.author_id == current_user.id,
        Event.is_deleted == True
    ).order_by(Event.updated_at.desc()).all()

    response = []
    for event in trash:
        event_dict = {
            **event.__dict__,
            "author_username": event.author.username,
            "author_full_name": event.author.full_name,
            "like_count": len(event.likes),
            "comment_count": len(event.comments),
            "content_blocks": event.content_blocks,
            "locations": event.locations if event.locations else []
        }
        response.append(EventResponse.model_validate(event_dict))

    return response

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    event = db.query(Event).options(
        joinedload(Event.locations)
    ).filter(Event.id == event_id).first()

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
        "content_blocks": event.content_blocks,
        "locations": event.locations if event.locations else []
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

    # Validate location count if multiple locations enabled
    # Check both the new value (if set) and existing event value
    update_dict = event_data.model_dump(exclude_unset=True)
    has_multiple = update_dict.get('has_multiple_locations', event.has_multiple_locations)
    description = update_dict.get('description', event.description)

    if has_multiple and description:
        is_valid, location_count = validate_location_count(description)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Too many location markers. Found {location_count}, maximum allowed is 20. Please reduce the number of location markers in your content."
            )

    for key, value in update_dict.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)

    # Re-extract and save location markers from HTML content if multiple locations enabled
    if event.has_multiple_locations and event.description:
        # Delete existing inline_marker locations for this event
        db.query(EventLocation).filter(
            EventLocation.event_id == event.id,
            EventLocation.location_type == 'inline_marker'
        ).delete()

        # Extract and add new locations
        location_markers = extract_location_markers(event.description)
        for marker in location_markers:
            event_location = EventLocation(
                event_id=event.id,
                location_name=marker['location_name'],
                latitude=marker['latitude'],
                longitude=marker['longitude'],
                location_type='inline_marker',
                timestamp=datetime.fromisoformat(marker['timestamp']) if marker.get('timestamp') else None,
                order_index=marker['order_index']
            )
            db.add(event_location)

        db.commit()
        db.refresh(event)  # Refresh to get updated locations with timestamps

    event_dict = {
        **event.__dict__,
        "author_username": event.author.username,
        "author_full_name": event.author.full_name,
        "like_count": len(event.likes),
        "comment_count": len(event.comments),
        "content_blocks": event.content_blocks,
        "locations": event.locations if event.locations else []
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
    """Soft delete - move event to trash"""
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    event.is_deleted = True
    db.commit()

    return {"message": "Event moved to trash"}

@router.post("/{event_id}/restore")
def restore_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore event from trash"""
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    event.is_deleted = False
    db.commit()

    return {"message": "Event restored"}

@router.delete("/{event_id}/permanent")
def permanently_delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently delete event from trash and cleanup associated images"""
    from ..utils.image_cleanup import cleanup_event_images

    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not event.is_deleted:
        raise HTTPException(status_code=400, detail="Event must be in trash before permanent deletion")

    # Clean up image files before deleting database record
    cleanup_result = cleanup_event_images(event)
    print(f"Image cleanup for event {event_id}: {cleanup_result['files_deleted']} files deleted, {cleanup_result['files_not_found']} not found")

    # Delete database record (SQLAlchemy will cascade delete related records)
    db.delete(event)
    db.commit()

    return {
        "message": "Event permanently deleted",
        "images_deleted": cleanup_result['files_deleted'],
        "images_not_found": cleanup_result['files_not_found']
    }

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