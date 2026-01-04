from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import re
from ..core.database import get_db
from ..core.deps import get_current_user, get_current_user_optional
from ..models.user import User
from ..models.event import Event
from ..models.content_block import ContentBlock
from ..models.event_location import EventLocation
from ..models.event_image import EventImage
from ..models.follow import Follow
from ..schemas.event import EventCreate, EventUpdate, EventResponse, ContentBlockCreate, ContentBlockResponse
from ..utils.location_validator import validate_location_count, extract_location_markers
from ..services.email_service import send_new_event_notification_email


def extract_media_urls(html_content: str) -> List[dict]:
    """Extract image and video URLs from HTML content"""
    media = []
    if not html_content:
        return media

    # Extract image sources
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
    for match in re.finditer(img_pattern, html_content):
        url = match.group(1)
        if url and url.startswith('http'):
            media.append({'url': url, 'type': 'image'})

    # Extract video sources
    video_pattern = r'<video[^>]+src=["\']([^"\']+)["\']'
    for match in re.finditer(video_pattern, html_content):
        url = match.group(1)
        if url and url.startswith('http'):
            media.append({'url': url, 'type': 'video'})

    return media


def sync_event_images(event_id: int, html_content: str, db: Session):
    """Sync event_images table with media URLs in HTML content"""
    media_urls = extract_media_urls(html_content)

    # Get existing event_images for this event
    existing_images = db.query(EventImage).filter(EventImage.event_id == event_id).all()
    existing_urls = {img.image_url for img in existing_images}

    # Add new images that don't exist yet
    for idx, media in enumerate(media_urls):
        url = media['url']
        # Normalize URL - check against full/medium/thumbnail variants
        normalized = url.replace('/medium/', '/full/').replace('/thumbnails/', '/full/')

        # Check if any variant exists
        url_exists = any(
            normalized == existing.replace('/medium/', '/full/').replace('/thumbnails/', '/full/')
            for existing in existing_urls
        )

        if not url_exists:
            event_image = EventImage(
                event_id=event_id,
                image_url=normalized,
                media_type=media['type'],
                order_index=idx
            )
            db.add(event_image)

    db.commit()

router = APIRouter(prefix="/events", tags=["events"])

def build_event_dict(event):
    """Helper to build event dict without SQLAlchemy internals"""
    # Serialize locations properly (manual pins + GPS-extracted from images)
    locations = []
    if hasattr(event, 'locations') and event.locations:
        for loc in event.locations:
            locations.append({
                "id": loc.id,
                "event_id": loc.event_id,
                "location_name": loc.location_name,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "location_type": loc.location_type,  # 'manual', 'exif', 'inline_marker'
                "timestamp": loc.timestamp.isoformat() if loc.timestamp else None,
                "order_index": loc.order_index,
                "section_id": loc.section_id,
                "section_title": loc.section_title,
                "additional_data": loc.additional_data,
                "created_at": loc.created_at.isoformat() if loc.created_at else None,
                "updated_at": loc.updated_at.isoformat() if loc.updated_at else None
            })

    # Serialize event_images (for captions)
    images = []
    if hasattr(event, 'images') and event.images:
        for img in event.images:
            images.append({
                "id": img.id,
                "event_id": img.event_id,
                "image_url": img.image_url,
                "caption": img.caption,
                "latitude": img.latitude,
                "longitude": img.longitude,
                "timestamp": img.timestamp.isoformat() if img.timestamp else None,
                "order_index": img.order_index,
                "alt_text": img.alt_text,
                "width": img.width,
                "height": img.height,
                "file_size": img.file_size,
                "created_at": img.created_at.isoformat() if img.created_at else None,
                "updated_at": img.updated_at.isoformat() if img.updated_at else None
            })

    return {
        "id": event.id,
        "title": event.title,
        "short_title": event.short_title,
        "summary": event.summary,
        "description": event.description,
        "start_date": event.start_date,
        "end_date": event.end_date,
        "location_name": event.location_name,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "cover_image_url": event.cover_image_url,
        "has_multiple_locations": event.has_multiple_locations,
        "author_id": event.author_id,
        "author_username": event.author.username,
        "author_full_name": event.author.full_name,
        "view_count": event.view_count,
        "is_published": event.is_published,
        "privacy_level": event.privacy_level or "public",
        "category": event.category,
        "custom_group_id": event.custom_group_id,
        "share_enabled": event.share_enabled or False,
        "share_expires_at": event.share_expires_at,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
        "like_count": len(event.likes) if hasattr(event, 'likes') and event.likes else 0,
        "comment_count": len(event.comments) if hasattr(event, 'comments') and event.comments else 0,
        "content_blocks": [],  # Empty - content is in description field
        "locations": locations,  # Properly serialized locations
        "event_images": images  # Include event_images with captions
    }

@router.get("", response_model=List[EventResponse])
def get_events(
    skip: int = 0,
    limit: int = 100,
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    try:
        from sqlalchemy.orm import selectinload
        from ..utils.privacy import filter_events_by_privacy

        print(f"[EVENTS] Fetching events with skip={skip}, limit={limit}, category={category}, user={current_user.username if current_user else 'anonymous'}")

        # Start with base query
        query = db.query(Event).options(
            selectinload(Event.author)
        ).filter(
            Event.is_published == True,
            Event.is_deleted == False
        )

        # TEMPORARY: Exclude seed/demo data users from the feed
        # To re-enable demo data, comment out or remove these lines
        # Demo users: sarahw, tomw, emmaw (IDs 1, 2, 3 from supabase_seed.sql)
        DEMO_USER_IDS = [1, 2, 3]
        query = query.filter(~Event.author_id.in_(DEMO_USER_IDS))
        # END TEMPORARY

        # Apply privacy filtering
        query = filter_events_by_privacy(query, current_user, db)

        # Apply category filter if provided
        if category:
            query = query.filter(Event.category == category)

        # Apply pagination and ordering - order by start_date (most recent first)
        events = query.order_by(Event.start_date.desc()).offset(skip).limit(limit).all()

        print(f"[EVENTS] Found {len(events)} events")

        response = []
        for i, event in enumerate(events):
            try:
                print(f"[EVENTS] Processing event {i+1}: id={event.id}, title={event.title}")
                # Explicitly map fields - don't use **event.__dict__ as it includes SQLAlchemy internals
                # NOTE: Don't include description in list view - it can be huge (rich text HTML + images)
                # Description is only loaded in detail view to keep payload small
                event_dict = {
                    "id": event.id,
                    "title": event.title,
                    "summary": event.summary,
                    "description": "",  # Empty in list view - loaded in detail view only
                    "start_date": event.start_date,
                    "end_date": event.end_date,
                    "location_name": event.location_name,
                    "latitude": event.latitude,
                    "longitude": event.longitude,
                    "cover_image_url": event.cover_image_url,
                    "has_multiple_locations": event.has_multiple_locations,
                    "author_id": event.author_id,
                    "author_username": event.author.username,
                    "author_full_name": event.author.full_name,
                    "view_count": event.view_count,
                    "is_published": event.is_published,
                    "privacy_level": event.privacy_level or "public",
                    "category": event.category,
                    "custom_group_id": event.custom_group_id,
                    "share_enabled": event.share_enabled or False,
                    "share_expires_at": event.share_expires_at,
                    "created_at": event.created_at,
                    "updated_at": event.updated_at,
                    "like_count": 0,  # TODO: Add later
                    "comment_count": 0,  # TODO: Add later
                    "content_blocks": [],  # Empty - content is in description field
                    "locations": []  # Empty in list view - loaded in detail view
                }
                response.append(EventResponse.model_validate(event_dict))
                print(f"[EVENTS] Successfully processed event {event.id}")
            except Exception as e:
                print(f"[EVENTS] ERROR processing event {event.id}: {e}")
                import traceback
                traceback.print_exc()
                # Skip this event and continue
                continue

        print(f"[EVENTS] Returning {len(response)} events")
        return response
    except Exception as e:
        print(f"[EVENTS] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events: {str(e)}"
        )

@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,
    background_tasks: BackgroundTasks,
    is_published: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user has an active subscription (trial or paid)
    # Expired users cannot create new events
    if not current_user.can_access_content():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your subscription has expired. Please subscribe to create new events."
        )

    # Check event limit for free users (those still on trial)
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

    # Validate location count (max 20)
    if event_data.description:
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

    # Extract and save location markers from HTML content
    if event.description:
        location_markers = extract_location_markers(event.description)
        if location_markers:
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

    # Save GPS-extracted locations from uploaded images
    if event_data.gps_locations:
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

    # Sync event_images table with media URLs in HTML content
    if event.description:
        sync_event_images(event.id, event.description, db)
        db.refresh(event)

    # Send notification to followers if event is published
    if is_published:
        try:
            # Get all followers of the current user who have notifications enabled
            followers = db.query(Follow).filter(
                Follow.following_id == current_user.id,
                Follow.status == "accepted"
            ).all()

            author_name = current_user.display_name or current_user.full_name or current_user.username
            event_url = f"https://www.ourfamilysocials.com/event/{event.id}"

            for follow in followers:
                follower = follow.follower
                # Check if follower wants notifications
                should_notify = (
                    (follower.email_notifications_enabled is None or follower.email_notifications_enabled) and
                    (follower.notify_new_event_from_followed is None or follower.notify_new_event_from_followed)
                )

                if should_notify and follower.email:
                    background_tasks.add_task(
                        send_new_event_notification_email,
                        to_email=follower.email,
                        follower_username=follower.display_name or follower.username,
                        author_name=author_name,
                        event_title=event.title,
                        event_url=event_url,
                        cover_image_url=event.cover_image_url
                    )
                    print(f"📧 Queued new event notification for {follower.email}")
        except Exception as e:
            print(f"⚠️ Failed to queue follower notifications: {e}")
            # Don't fail event creation if notifications fail

    try:
        # Explicitly map fields - don't use **event.__dict__
        event_dict = {
            "id": event.id,
            "title": event.title,
            "short_title": event.short_title,
            "summary": event.summary,
            "description": event.description,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "location_name": event.location_name,
            "latitude": event.latitude,
            "longitude": event.longitude,
            "cover_image_url": event.cover_image_url,
            "has_multiple_locations": event.has_multiple_locations,
            "privacy_level": event.privacy_level or "public",
            "category": event.category,
            "custom_group_id": event.custom_group_id,
            "author_id": event.author_id,
            "author_username": event.author.username,
            "author_full_name": event.author.full_name,
            "view_count": event.view_count,
            "is_published": event.is_published,
            "share_enabled": event.share_enabled or False,
            "share_expires_at": event.share_expires_at,
            "created_at": event.created_at,
            "updated_at": event.updated_at,
            "like_count": 0,
            "comment_count": 0,
            "content_blocks": [],
            "locations": event.locations if event.locations else [],
            "event_images": []
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
    ).order_by(Event.start_date.desc()).all()

    response = []
    for event in drafts:
        event_dict = build_event_dict(event)
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
    ).order_by(Event.start_date.desc()).all()

    response = []
    for event in trash:
        event_dict = build_event_dict(event)
        response.append(EventResponse.model_validate(event_dict))

    return response

@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    from sqlalchemy.orm import joinedload
    from ..utils.privacy import can_view_event, get_event_privacy_display

    event = db.query(Event).options(
        joinedload(Event.locations),
        joinedload(Event.images)  # Load event_images relationship
    ).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check privacy permissions
    if not can_view_event(event, current_user, db):
        privacy_info = get_event_privacy_display(event, db)

        # Check if current user has a pending follow request to the author
        follow_request_pending = False
        if current_user:
            pending_request = db.query(Follow).filter(
                Follow.follower_id == current_user.id,
                Follow.following_id == event.author_id,
                Follow.status == "pending"
            ).first()
            follow_request_pending = pending_request is not None

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": "You don't have permission to view this event",
                "privacy_level": privacy_info["level"],
                "privacy_display": privacy_info["display"],
                "privacy_description": privacy_info["description"],
                "author_username": event.author.username,
                "author_full_name": event.author.full_name,
                "requires_auth": not current_user,
                "requires_follow": privacy_info["level"] in ["followers", "close_family", "custom_group"],
                "follow_request_pending": follow_request_pending
            }
        )

    # Check subscription access for expired users
    # Expired users can only view public events or events from people they follow
    if current_user and not current_user.can_view_event(event, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "message": "Upgrade to Premium to view this event, or follow this user to see their content.",
                "subscription_required": True,
                "author_username": event.author.username,
                "author_full_name": event.author.full_name
            }
        )

    event.view_count += 1
    db.commit()

    # Re-query with relationships loaded (refresh doesn't preserve joinedloads)
    event = db.query(Event).options(
        joinedload(Event.locations),
        joinedload(Event.images)
    ).filter(Event.id == event_id).first()

    event_dict = build_event_dict(event)
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

    # Get update data
    update_dict = event_data.model_dump(exclude_unset=True)

    # Check event limit for free users if publishing a draft
    if current_user.subscription_tier == 'free':
        # Check if this update is publishing a previously unpublished event
        is_now_publishing = update_dict.get('is_published', False) and not event.is_published

        if is_now_publishing:
            published_events_count = db.query(Event).filter(
                Event.author_id == current_user.id,
                Event.is_published == True,
                Event.is_deleted == False
            ).count()

            if published_events_count >= 5:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Free plan limit reached. You can only have 5 published events. Please upgrade to Premium for unlimited events."
                )

    # Validate location count (max 20)
    description = update_dict.get('description', event.description)
    if description:
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

    # Re-extract and save location markers from HTML content
    if event.description:
        # Delete existing inline_marker locations for this event
        db.query(EventLocation).filter(
            EventLocation.event_id == event.id,
            EventLocation.location_type == 'inline_marker'
        ).delete()

        # Extract and add new locations
        location_markers = extract_location_markers(event.description)
        if location_markers:
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

    # Sync event_images table with media URLs in HTML content
    if event.description:
        sync_event_images(event.id, event.description, db)
        db.refresh(event)

    event_dict = build_event_dict(event)
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

    # Check event limit for free users if restoring a published event
    if current_user.subscription_tier == 'free' and event.is_published:
        published_events_count = db.query(Event).filter(
            Event.author_id == current_user.id,
            Event.is_published == True,
            Event.is_deleted == False
        ).count()

        if published_events_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free plan limit reached. You can only have 5 published events. Please upgrade to Premium for unlimited events."
            )

    event.is_deleted = False
    db.commit()

    return {"message": "Event restored"}

@router.post("/{event_id}/publish")
def publish_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Publish a draft event (make it visible to followers)"""
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if event.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot publish deleted events. Restore from trash first.")

    # If already published, just return success
    if event.is_published:
        return {"message": "Event is already published"}

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
                detail="Free plan limit reached. You can only have 5 published events. Please upgrade to Premium for unlimited events."
            )

    event.is_published = True
    db.commit()

    return {"message": "Event published successfully"}

@router.post("/{event_id}/unpublish")
def unpublish_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unpublish an event (move to drafts, hide from followers)"""
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # If already unpublished, just return success
    if not event.is_published:
        return {"message": "Event is already a draft"}

    event.is_published = False
    db.commit()

    return {"message": "Event moved to drafts"}

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

    # Try to clean up image/video files, but don't let cleanup failures block deletion
    cleanup_result = {'files_deleted': 0, 'files_not_found': 0, 'errors': []}
    try:
        cleanup_result = cleanup_event_images(event)
        print(f"✓ Cleanup for event {event_id}: {cleanup_result.get('files_deleted', 0)} files deleted")
    except Exception as e:
        error_msg = f"Warning: Cleanup failed for event {event_id}: {str(e)}"
        print(error_msg)
        cleanup_result['errors'].append(error_msg)
        # Continue with deletion even if cleanup failed

    # Delete database record (SQLAlchemy will cascade delete related records)
    db.delete(event)
    db.commit()

    return {
        "message": "Event permanently deleted",
        "images_deleted": cleanup_result.get('files_deleted', 0),
        "images_not_found": cleanup_result.get('files_not_found', 0),
        "cleanup_errors": cleanup_result.get('errors', [])
    }

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


@router.post("/admin/sync-event-images")
def sync_all_event_images(
    db: Session = Depends(get_db)
):
    """One-time migration to sync event_images for all existing events"""
    events = db.query(Event).filter(Event.description.isnot(None)).all()
    synced_count = 0
    images_added = 0

    for event in events:
        if event.description:
            before_count = db.query(EventImage).filter(EventImage.event_id == event.id).count()
            sync_event_images(event.id, event.description, db)
            after_count = db.query(EventImage).filter(EventImage.event_id == event.id).count()
            if after_count > before_count:
                synced_count += 1
                images_added += (after_count - before_count)

    return {
        "message": f"Synced {synced_count} events, added {images_added} new image records",
        "events_processed": len(events)
    }