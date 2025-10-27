from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pathlib import Path
import re
import httpx
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from ..core.database import get_db
from ..models.event import Event
from ..models.event_location import EventLocation
from ..models.user import User
from ..schemas.event_location import EventLocationCreate, EventLocationUpdate, EventLocation as EventLocationSchema
from ..core.deps import get_current_user

router = APIRouter()

@router.post("/events/{event_id}/locations", response_model=EventLocationSchema, status_code=status.HTTP_201_CREATED)
def create_event_location(
    event_id: int,
    location: EventLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a location to an event (max 20 locations per event)"""
    # Check if event exists and user is the author
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this event")

    # Check location limit (max 20)
    location_count = db.query(EventLocation).filter(EventLocation.event_id == event_id).count()
    if location_count >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 locations per event")

    # Create new location
    db_location = EventLocation(
        event_id=event_id,
        **location.model_dump()
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)

    return db_location


@router.get("/events/{event_id}/locations", response_model=List[EventLocationSchema])
def get_event_locations(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Get all locations for an event, ordered by order_index and timestamp"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    locations = db.query(EventLocation).filter(
        EventLocation.event_id == event_id
    ).order_by(
        EventLocation.order_index,
        EventLocation.timestamp
    ).all()

    return locations


@router.put("/events/{event_id}/locations/{location_id}", response_model=EventLocationSchema)
def update_event_location(
    event_id: int,
    location_id: int,
    location_update: EventLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific location"""
    # Check if event exists and user is the author
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this event")

    # Get the location
    db_location = db.query(EventLocation).filter(
        EventLocation.id == location_id,
        EventLocation.event_id == event_id
    ).first()

    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Update fields
    update_data = location_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location, field, value)

    db.commit()
    db.refresh(db_location)

    return db_location


@router.delete("/events/{event_id}/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_location(
    event_id: int,
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific location"""
    # Check if event exists and user is the author
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this event")

    # Get and delete the location
    db_location = db.query(EventLocation).filter(
        EventLocation.id == location_id,
        EventLocation.event_id == event_id
    ).first()

    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")

    db.delete(db_location)
    db.commit()

    return None


@router.post("/events/{event_id}/locations/reorder", response_model=List[EventLocationSchema])
def reorder_event_locations(
    event_id: int,
    location_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reorder locations by providing a list of location IDs in the desired order"""
    # Check if event exists and user is the author
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this event")

    # Update order_index for each location
    for index, location_id in enumerate(location_ids):
        db_location = db.query(EventLocation).filter(
            EventLocation.id == location_id,
            EventLocation.event_id == event_id
        ).first()

        if db_location:
            db_location.order_index = index

    db.commit()

    # Return updated locations
    locations = db.query(EventLocation).filter(
        EventLocation.event_id == event_id
    ).order_by(EventLocation.order_index).all()

    return locations


# Helper functions for GPS extraction
def get_decimal_from_dms(dms, ref):
    """Convert GPS DMS (degrees, minutes, seconds) to decimal degrees"""
    degrees = dms[0]
    minutes = dms[1] / 60.0
    seconds = dms[2] / 3600.0
    decimal = degrees + minutes + seconds
    if ref in ['S', 'W']:
        decimal = -decimal
    return decimal


def extract_gps_from_image(image_path: Path) -> Dict[str, float] | None:
    """Extract GPS coordinates from an image file"""
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()

        if not exif_data:
            return None

        gps_info = {}
        for tag, value in exif_data.items():
            decoded = TAGS.get(tag, tag)
            if decoded == "GPSInfo":
                for gps_tag in value:
                    gps_decoded = GPSTAGS.get(gps_tag, gps_tag)
                    gps_info[gps_decoded] = value[gps_tag]

        if not gps_info:
            return None

        # Extract latitude and longitude
        lat = get_decimal_from_dms(
            gps_info['GPSLatitude'],
            gps_info['GPSLatitudeRef']
        )
        lon = get_decimal_from_dms(
            gps_info['GPSLongitude'],
            gps_info['GPSLongitudeRef']
        )

        return {'latitude': lat, 'longitude': lon}
    except Exception:
        return None


async def reverse_geocode(latitude: float, longitude: float) -> str:
    """Get location name from coordinates using Nominatim"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": latitude, "lon": longitude, "format": "json"},
                headers={"User-Agent": "OurFamilySocials/1.0"},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("display_name", f"{latitude:.6f}, {longitude:.6f}")
        except Exception:
            pass
    return f"{latitude:.6f}, {longitude:.6f}"


@router.post("/events/{event_id}/locations/extract-from-images")
async def extract_locations_from_images(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Extract GPS locations from images in the event's content and create location records.
    Only works for events with has_multiple_locations=True.
    """
    # Check if event exists and user is the author
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this event")

    if not event.has_multiple_locations:
        raise HTTPException(
            status_code=400,
            detail="Event must have multi-location enabled to extract locations from images"
        )

    # Check current location count
    current_location_count = db.query(EventLocation).filter(
        EventLocation.event_id == event_id
    ).count()

    if current_location_count >= 20:
        raise HTTPException(status_code=400, detail="Event already has maximum 20 locations")

    # Parse HTML content for image URLs
    description = event.description or ""
    # Find all image src attributes
    image_pattern = r'<img[^>]+src="([^"]+)"'
    image_urls = re.findall(image_pattern, description)

    locations_created = []
    locations_found = 0

    # Process each image
    for img_url in image_urls:
        # Check if we've hit the limit
        if current_location_count >= 20:
            break

        # Convert URL to local file path
        # URLs are in format: /uploads/medium/filename.jpg or /uploads/full/filename.jpg
        if not img_url.startswith('/uploads/'):
            continue

        # Try both medium and full directories
        for subdir in ['full', 'medium']:
            filename = img_url.split('/')[-1]
            image_path = Path(f"uploads/{subdir}/{filename}")

            if not image_path.exists():
                continue

            # Extract GPS data
            gps_data = extract_gps_from_image(image_path)
            if not gps_data:
                continue

            locations_found += 1

            # Get location name via reverse geocoding
            location_name = await reverse_geocode(
                gps_data['latitude'],
                gps_data['longitude']
            )

            # Check if location already exists (avoid duplicates)
            existing = db.query(EventLocation).filter(
                EventLocation.event_id == event_id,
                EventLocation.latitude == gps_data['latitude'],
                EventLocation.longitude == gps_data['longitude']
            ).first()

            if existing:
                continue

            # Create location record
            db_location = EventLocation(
                event_id=event_id,
                location_name=location_name,
                latitude=gps_data['latitude'],
                longitude=gps_data['longitude'],
                location_type='exif',
                order_index=current_location_count
            )
            db.add(db_location)
            db.commit()
            db.refresh(db_location)

            locations_created.append(db_location)
            current_location_count += 1

            # Stop after finding GPS in this image
            break

    return {
        "message": f"Found {locations_found} images with GPS data, created {len(locations_created)} new locations",
        "locations_created": len(locations_created),
        "images_scanned": len(image_urls),
        "locations": [
            {
                "id": loc.id,
                "location_name": loc.location_name,
                "latitude": loc.latitude,
                "longitude": loc.longitude
            }
            for loc in locations_created
        ]
    }
