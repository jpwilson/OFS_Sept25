from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path
from PIL import Image, ImageOps
from PIL.ExifTags import TAGS, GPSTAGS
import io
from datetime import datetime

# Register HEIC/HEIF support for Pillow (iPhone photos)
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # pillow-heif not installed, HEIC files won't be supported
from ..core.config import settings
from ..core.database import get_db
from ..core.deps import get_current_user, require_not_demo
from ..models.event_image import EventImage
from ..models.event import Event
from ..models.user import User
from ..schemas.event_image import EventImageCreate, EventImageResponse, EventImageUpdate
from ..utils.r2_client import (
    r2_configured,
    r2_put,
    r2_delete,
    r2_presign_put,
)

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = Any  # Type hint placeholder

router = APIRouter(tags=["upload"])


# Schema for recording an already-uploaded image URL
class EventImageRecordCreate(BaseModel):
    event_id: int
    image_url: str
    caption: Optional[str] = None
    order_index: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[str] = None

def get_supabase_client() -> Client:
    """Get or create Supabase client (lazy initialization)"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase storage not configured. Please set SUPABASE_URL and SUPABASE_KEY."
        )

    try:
        # Create client with minimal options to avoid proxy argument error
        return create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_KEY
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize Supabase client: {str(e)}"
        )

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Image sizes
THUMBNAIL_SIZE = (300, 300)
MEDIUM_SIZE = (1200, 1200)


def storage_put(storage_path: str, data: bytes, content_type: str, *, bucket: str) -> str:
    """Upload bytes to R2 when configured, otherwise Supabase Storage.

    Returns the public URL. The object key / storage_path is identical in both
    backends so existing folder conventions (full/ medium/ thumbnails/) are
    preserved and delete logic keeps working.
    """
    if r2_configured():
        return r2_put(storage_path, data, content_type)

    supabase_client = get_supabase_client()
    supabase_client.storage.from_(bucket).upload(
        path=storage_path,
        file=data,
        file_options={"content-type": content_type},
    )
    return supabase_client.storage.from_(bucket).get_public_url(storage_path)


def get_decimal_from_dms(dms, ref):
    """
    Convert GPS DMS (degrees, minutes, seconds) to decimal degrees
    """
    degrees = dms[0]
    minutes = dms[1] / 60.0
    seconds = dms[2] / 3600.0

    decimal = degrees + minutes + seconds

    if ref in ['S', 'W']:
        decimal = -decimal

    return decimal


def extract_gps_data(exif_data: Dict) -> Optional[Dict[str, float]]:
    """
    Extract GPS coordinates from EXIF data
    """
    gps_info = {}

    for tag, value in exif_data.items():
        decoded = TAGS.get(tag, tag)
        if decoded == "GPSInfo":
            for gps_tag in value:
                gps_decoded = GPSTAGS.get(gps_tag, gps_tag)
                gps_info[gps_decoded] = value[gps_tag]

    if not gps_info:
        return None

    try:
        # Extract latitude and longitude
        lat = get_decimal_from_dms(
            gps_info['GPSLatitude'],
            gps_info['GPSLatitudeRef']
        )
        lon = get_decimal_from_dms(
            gps_info['GPSLongitude'],
            gps_info['GPSLongitudeRef']
        )

        return {
            'latitude': lat,
            'longitude': lon
        }
    except (KeyError, TypeError, IndexError):
        return None


def extract_exif_metadata(image: Image.Image) -> Dict[str, Any]:
    """
    Extract useful EXIF metadata from image
    """
    metadata = {
        'has_exif': False,
        'gps': None,
        'date_taken': None,
        'camera': None,
        'dimensions': {
            'width': image.width,
            'height': image.height
        }
    }

    try:
        exif_data = image._getexif()
        if not exif_data:
            return metadata

        metadata['has_exif'] = True

        # Extract GPS data
        metadata['gps'] = extract_gps_data(exif_data)

        # Extract other useful metadata
        for tag, value in exif_data.items():
            decoded = TAGS.get(tag, tag)

            if decoded == "DateTime" or decoded == "DateTimeOriginal":
                try:
                    metadata['date_taken'] = str(value)
                except:
                    pass

            elif decoded == "Model":
                metadata['camera'] = str(value)

    except Exception as e:
        # If EXIF extraction fails, just return basic metadata
        pass

    return metadata


def resize_image(image: Image.Image, max_size: tuple, quality: int = 85) -> bytes:
    """
    Resize image while maintaining aspect ratio
    """
    # Create a copy to avoid modifying the original
    img = image.copy()

    # Convert RGBA to RGB if needed (for JPEG)
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background

    # Resize maintaining aspect ratio
    img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Save to bytes
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=quality, optimize=True)
    output.seek(0)
    return output.getvalue()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an image file to R2 (or Supabase Storage fallback) and return URLs
    for different sizes.
    """
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"'{file_ext}' is not a supported image format. Allowed formats: JPG, PNG, GIF, WebP, HEIC"
        )

    # Read file content
    contents = await file.read()

    # Validate file size
    file_size_mb = len(contents) / (1024 * 1024)
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Image is too large ({file_size_mb:.1f}MB). Maximum size is 10MB."
        )

    # Generate unique filename (use .jpg for all outputs)
    unique_id = str(uuid.uuid4())
    base_filename = f"{unique_id}.jpg"

    try:
        # Open image with Pillow
        image = Image.open(io.BytesIO(contents))

        # Extract EXIF metadata before any processing
        metadata = extract_exif_metadata(image)

        # Apply EXIF orientation - this fixes upside-down/rotated photos from phones
        # Must be done AFTER extracting metadata but BEFORE resizing
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass  # If EXIF transpose fails, continue with original image

        # Process and upload all image sizes to Supabase
        sizes = {
            "full": (resize_image(image, (4000, 4000), quality=90), f"full/{base_filename}"),
            "medium": (resize_image(image, MEDIUM_SIZE, quality=85), f"medium/{base_filename}"),
            "thumbnail": (resize_image(image, THUMBNAIL_SIZE, quality=80), f"thumbnails/{base_filename}")
        }

        urls = {}
        for size_name, (image_bytes, storage_path) in sizes.items():
            # Upload to R2 (zero egress) when configured, else Supabase Storage
            urls[size_name] = storage_put(
                storage_path, image_bytes, "image/jpeg", bucket=settings.SUPABASE_BUCKET
            )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading image to storage: {str(e)}"
        )

    # Return URLs for all sizes plus metadata
    return {
        "filename": base_filename,
        "url": urls["medium"],  # Default to medium
        "urls": {
            "thumbnail": urls["thumbnail"],
            "medium": urls["medium"],
            "full": urls["full"]
        },
        "metadata": metadata
    }


@router.post("/upload/event-image", response_model=EventImageResponse)
async def upload_event_image(
    file: UploadFile = File(...),
    event_id: int = Form(...),
    caption: Optional[str] = Form(None),
    order_index: int = Form(0),
    alt_text: Optional[str] = Form(None),
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db)
):
    """
    Upload an image for an event and save it to the event_images table
    Extracts GPS data from EXIF if available
    """
    # Verify event exists and user has permission
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to add images to this event"
        )

    # Check image limit based on subscription tier
    existing_images_count = db.query(EventImage).filter(
        EventImage.event_id == event_id
    ).count()

    max_images = 300 if current_user.subscription_tier in ['premium', 'family'] else 50
    if existing_images_count >= max_images:
        raise HTTPException(
            status_code=403,
            detail=f"Image limit reached. {current_user.subscription_tier.title()} users can upload up to {max_images} images per event."
        )

    # Get file size before processing
    file_contents = await file.read()
    file_size = len(file_contents)

    # Reset file pointer for upload
    await file.seek(0)

    # Upload the image (reuse existing upload logic)
    upload_result = await upload_file(file)

    # Extract GPS and timestamp from metadata
    gps_data = upload_result.get("metadata", {}).get("gps")
    date_taken_str = upload_result.get("metadata", {}).get("date_taken")
    dimensions = upload_result.get("metadata", {}).get("dimensions", {})

    # Parse date_taken to datetime
    timestamp = None
    if date_taken_str:
        try:
            # EXIF format: "2025:10:19 10:49:07"
            timestamp = datetime.strptime(date_taken_str, "%Y:%m:%d %H:%M:%S")
        except (ValueError, AttributeError):
            pass

    # Create event_image record
    event_image = EventImage(
        event_id=event_id,
        image_url=upload_result["urls"]["full"],  # Use full size URL
        caption=caption,
        latitude=gps_data.get("latitude") if gps_data else None,
        longitude=gps_data.get("longitude") if gps_data else None,
        timestamp=timestamp,
        order_index=order_index,
        alt_text=alt_text,
        width=dimensions.get("width"),
        height=dimensions.get("height"),
        file_size=file_size
    )

    db.add(event_image)
    db.commit()
    db.refresh(event_image)

    return event_image


@router.post("/upload/event-image-record", response_model=EventImageResponse)
async def create_event_image_record(
    data: EventImageRecordCreate,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db)
):
    """
    Save an already-uploaded image URL + GPS data to the database.
    This endpoint is for images already uploaded to R2 from the frontend.
    No file processing - just database record creation.
    """
    # Verify event exists and user has permission
    event = db.query(Event).filter(Event.id == data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to add images to this event"
        )

    # Check image limit based on subscription tier
    existing_images_count = db.query(EventImage).filter(
        EventImage.event_id == data.event_id
    ).count()

    max_images = 300 if current_user.subscription_tier in ['premium', 'family'] else 50
    if existing_images_count >= max_images:
        raise HTTPException(
            status_code=403,
            detail=f"Image limit reached. {current_user.subscription_tier.title()} users can upload up to {max_images} images per event."
        )

    # Parse timestamp if provided
    parsed_timestamp = None
    if data.timestamp:
        try:
            # Try EXIF format: "2025:10:19 10:49:07"
            parsed_timestamp = datetime.strptime(data.timestamp, "%Y:%m:%d %H:%M:%S")
        except (ValueError, AttributeError):
            try:
                # Try ISO format: "2025-10-19T10:49:07"
                parsed_timestamp = datetime.fromisoformat(data.timestamp)
            except (ValueError, AttributeError):
                pass  # If parsing fails, leave as None

    # Create event_image record
    event_image = EventImage(
        event_id=data.event_id,
        image_url=data.image_url,
        caption=data.caption,
        order_index=data.order_index,
        latitude=data.latitude,
        longitude=data.longitude,
        timestamp=parsed_timestamp
    )

    db.add(event_image)
    db.commit()
    db.refresh(event_image)

    return event_image


@router.delete("/upload/event-image/{image_id}")
async def delete_event_image(
    image_id: int,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db)
):
    """
    Delete an event image from the database and Supabase Storage
    """
    # Get the image record
    event_image = db.query(EventImage).filter(EventImage.id == image_id).first()
    if not event_image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Verify permission (user must be event author)
    event = db.query(Event).filter(Event.id == event_image.event_id).first()
    if not event or event.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this image"
        )

    # Delete the underlying object(s) from storage (R2 or Supabase)
    image_url = event_image.image_url or ""
    is_r2 = bool(settings.R2_PUBLIC_DOMAIN) and settings.R2_PUBLIC_DOMAIN in image_url
    try:
        if "/full/" in image_url:
            # Image: delete all three sizes (full, medium, thumbnail)
            base_path = image_url.split("/full/")[-1].split("?")[0]
            if is_r2:
                r2_delete([f"full/{base_path}", f"medium/{base_path}", f"thumbnails/{base_path}"])
            else:
                supabase_client = get_supabase_client()
                for size in ["full", "medium", "thumbnails"]:
                    try:
                        supabase_client.storage.from_(settings.SUPABASE_BUCKET).remove([f"{size}/{base_path}"])
                    except Exception as e:
                        print(f"Warning: Failed to delete {size} version: {e}")

        # Also clean up the R2 video object + its thumbnail when present
        if is_r2 and event_image.media_type == "video":
            keys = [image_url.split(f"{settings.R2_PUBLIC_DOMAIN}/")[-1].split("?")[0]]
            thumb = event_image.video_thumbnail_url or ""
            if "/full/" in thumb and settings.R2_PUBLIC_DOMAIN in thumb:
                tbase = thumb.split("/full/")[-1].split("?")[0]
                keys += [f"full/{tbase}", f"medium/{tbase}", f"thumbnails/{tbase}"]
            r2_delete(keys)
    except Exception as e:
        print(f"Warning: Failed to delete from storage: {e}")
        # Continue with database deletion even if storage deletion fails

    # Delete from database
    db.delete(event_image)
    db.commit()

    return {"message": "Image deleted successfully"}


@router.get("/upload/event-images/{event_id}", response_model=list[EventImageResponse])
async def get_event_images(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all images for an event, ordered by order_index
    """
    images = db.query(EventImage).filter(
        EventImage.event_id == event_id
    ).order_by(EventImage.order_index).all()

    return images


@router.patch("/upload/event-image/{image_id}", response_model=EventImageResponse)
async def update_event_image_caption(
    image_id: int,
    update_data: EventImageUpdate,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db)
):
    """
    Update an event image's caption and other fields
    """
    # Get the image record
    event_image = db.query(EventImage).filter(EventImage.id == image_id).first()
    if not event_image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Verify permission (user must be event author)
    event = db.query(Event).filter(Event.id == event_image.event_id).first()
    if not event or event.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to edit this image"
        )

    # Update fields from the update_data
    # For caption: always update since frontend explicitly sends null to clear
    # Using model_dump to get only the fields that were actually sent
    update_dict = update_data.model_dump(exclude_unset=True)

    if 'caption' in update_dict:
        event_image.caption = update_dict['caption']
    if 'order_index' in update_dict:
        event_image.order_index = update_dict['order_index']
    if 'alt_text' in update_dict:
        event_image.alt_text = update_dict['alt_text']

    db.commit()
    db.refresh(event_image)

    return event_image


@router.post("/upload/event-image-metadata", response_model=EventImageResponse)
async def create_event_image_metadata(
    image_data: EventImageCreate,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db)
):
    """
    Create an event_image record for an already-uploaded image
    Used when images are uploaded via RichTextEditor and need captions added later
    """
    # Verify event exists and user has permission
    event = db.query(Event).filter(Event.id == image_data.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to add images to this event"
        )

    # Check image limit based on subscription tier
    existing_images_count = db.query(EventImage).filter(
        EventImage.event_id == image_data.event_id
    ).count()

    max_images = 300 if current_user.subscription_tier in ['premium', 'family'] else 50
    if existing_images_count >= max_images:
        raise HTTPException(
            status_code=403,
            detail=f"Image limit reached. {current_user.subscription_tier.title()} users can upload up to {max_images} images per event."
        )

    # Create event_image record
    event_image = EventImage(
        event_id=image_data.event_id,
        image_url=image_data.image_url,
        caption=image_data.caption,
        order_index=image_data.order_index,
        alt_text=image_data.alt_text,
        latitude=image_data.latitude if hasattr(image_data, 'latitude') else None,
        longitude=image_data.longitude if hasattr(image_data, 'longitude') else None,
        timestamp=image_data.timestamp if hasattr(image_data, 'timestamp') else None,
        media_type=image_data.media_type if hasattr(image_data, 'media_type') else 'image',
        duration_seconds=image_data.duration_seconds if hasattr(image_data, 'duration_seconds') else None,
        video_thumbnail_url=image_data.video_thumbnail_url if hasattr(image_data, 'video_thumbnail_url') else None
    )

    db.add(event_image)
    db.commit()
    db.refresh(event_image)

    return event_image


class PresignRequest(BaseModel):
    filename: str
    content_type: Optional[str] = None


@router.post("/upload/r2-presign")
async def create_r2_presign(
    body: PresignRequest,
    current_user: User = Depends(require_not_demo),
):
    """
    Return a presigned PUT URL so the browser can upload a (client-compressed)
    video directly to R2, bypassing the Vercel ~4.5MB request-body limit.
    The caller then records the returned public_url via /upload/event-image-metadata.
    """
    if not r2_configured():
        raise HTTPException(status_code=503, detail="R2 storage is not configured")

    file_ext = os.path.splitext(body.filename)[1].lower()
    if file_ext not in settings.ALLOWED_VIDEO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"'{file_ext}' is not a supported video format. Allowed formats: MP4, MOV, AVI, WebM",
        )

    content_type = body.content_type or f"video/{file_ext[1:]}"
    key = f"videos/{uuid.uuid4()}{file_ext}"
    return r2_presign_put(key, content_type)


@router.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    """
    Upload a video file to R2 (or Supabase Storage fallback) and return the URL.
    Accepts: .mp4, .mov, .avi, .webm

    Note: files larger than ~4.5MB cannot pass through the Vercel request body
    limit — use POST /upload/r2-presign and PUT directly to R2 for those.
    """
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_VIDEO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"'{file_ext}' is not a supported video format. Allowed formats: MP4, MOV, AVI, WebM"
        )

    # Read file content
    contents = await file.read()

    # Validate file size
    file_size_mb = len(contents) / (1024 * 1024)
    if len(contents) > settings.MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Video is too large ({file_size_mb:.1f}MB). Maximum size is {settings.MAX_VIDEO_SIZE // (1024*1024)}MB."
        )

    # Generate unique filename (preserve extension)
    unique_id = str(uuid.uuid4())
    # On R2 keep videos under a videos/ prefix; Supabase uses a separate bucket
    video_key = f"videos/{unique_id}{file_ext}" if r2_configured() else f"{unique_id}{file_ext}"

    try:
        video_url = storage_put(
            video_key,
            contents,
            f"video/{file_ext[1:]}",  # e.g., video/mp4
            bucket=settings.SUPABASE_VIDEO_BUCKET,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading video to storage: {str(e)}"
        )

    # Return video URL and metadata
    return {
        "filename": video_key,
        "url": video_url,
        "file_size": len(contents),
        "format": file_ext[1:]  # Remove leading dot
    }


@router.post("/upload/event-video", response_model=EventImageResponse)
async def upload_event_video(
    file: UploadFile = File(...),
    event_id: int = Form(...),
    caption: Optional[str] = Form(None),
    order_index: int = Form(0),
    duration_seconds: Optional[int] = Form(None),
    thumbnail_url: Optional[str] = Form(None),
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db)
):
    """
    Upload a video for an event and save it to the event_images table
    The thumbnail should be uploaded separately first
    """
    # Verify event exists and user has permission
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to add videos to this event"
        )

    # Check media limit based on subscription tier
    existing_media_count = db.query(EventImage).filter(
        EventImage.event_id == event_id
    ).count()

    max_media = 300 if current_user.subscription_tier in ['premium', 'family'] else 50
    if existing_media_count >= max_media:
        raise HTTPException(
            status_code=403,
            detail=f"Media limit reached. {current_user.subscription_tier.title()} users can upload up to {max_media} images/videos per event."
        )

    # Get file size before processing
    file_contents = await file.read()
    file_size = len(file_contents)

    # Reset file pointer for upload
    await file.seek(0)

    # Upload the video (reuse existing upload logic)
    upload_result = await upload_video(file)

    # Create event_image record with media_type = 'video'
    event_video = EventImage(
        event_id=event_id,
        image_url=upload_result["url"],  # Store video URL in image_url field
        caption=caption,
        order_index=order_index,
        media_type='video',
        duration_seconds=duration_seconds,
        video_thumbnail_url=thumbnail_url,
        file_size=file_size
    )

    db.add(event_video)
    db.commit()
    db.refresh(event_video)

    return event_video
