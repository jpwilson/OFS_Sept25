from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional, Dict, Any
import os
import uuid
from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
from datetime import datetime
from ..core.config import settings

router = APIRouter(tags=["upload"])

# Create uploads directory if it doesn't exist
# Read from settings to support both local (./uploads) and Vercel (/tmp/uploads)
UPLOAD_DIR = Path(settings.UPLOAD_DIR)

# Create subdirectories for different sizes
THUMB_DIR = UPLOAD_DIR / "thumbnails"
MEDIUM_DIR = UPLOAD_DIR / "medium"
FULL_DIR = UPLOAD_DIR / "full"

# Try to create directories, but don't fail if we can't (Vercel may create them automatically)
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    MEDIUM_DIR.mkdir(parents=True, exist_ok=True)
    FULL_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    # On Vercel's serverless environment, /tmp may have different permissions
    # Directories will be created when first write occurs
    pass

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Image sizes
THUMBNAIL_SIZE = (300, 300)
MEDIUM_SIZE = (1200, 1200)


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
    Upload an image file and return URLs for different sizes
    """
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    contents = await file.read()

    # Validate file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024)}MB"
        )

    # Generate unique filename (use .jpg for all outputs)
    unique_id = str(uuid.uuid4())
    base_filename = f"{unique_id}.jpg"

    try:
        # Open image with Pillow
        image = Image.open(io.BytesIO(contents))

        # Extract EXIF metadata before resizing
        metadata = extract_exif_metadata(image)

        # Save full-size version (optimized but not resized)
        full_path = FULL_DIR / base_filename
        full_bytes = resize_image(image, (4000, 4000), quality=90)  # Max 4000px, high quality
        with open(full_path, "wb") as f:
            f.write(full_bytes)

        # Save medium version
        medium_path = MEDIUM_DIR / base_filename
        medium_bytes = resize_image(image, MEDIUM_SIZE, quality=85)
        with open(medium_path, "wb") as f:
            f.write(medium_bytes)

        # Save thumbnail version
        thumb_path = THUMB_DIR / base_filename
        thumb_bytes = resize_image(image, THUMBNAIL_SIZE, quality=80)
        with open(thumb_path, "wb") as f:
            f.write(thumb_bytes)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing image: {str(e)}"
        )

    # Return URLs for all sizes plus metadata
    return {
        "filename": base_filename,
        "url": f"/uploads/medium/{base_filename}",  # Default to medium
        "urls": {
            "thumbnail": f"/uploads/thumbnails/{base_filename}",
            "medium": f"/uploads/medium/{base_filename}",
            "full": f"/uploads/full/{base_filename}"
        },
        "metadata": metadata
    }
