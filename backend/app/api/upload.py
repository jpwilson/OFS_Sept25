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
from supabase import create_client, Client

router = APIRouter(tags=["upload"])

# Initialize Supabase client if credentials are available
supabase_client: Optional[Client] = None
print(f"DEBUG: SUPABASE_URL={settings.SUPABASE_URL[:20]}... (len={len(settings.SUPABASE_URL)})")
print(f"DEBUG: SUPABASE_KEY={'SET' if settings.SUPABASE_KEY else 'NOT SET'} (len={len(settings.SUPABASE_KEY)})")
print(f"DEBUG: SUPABASE_BUCKET={settings.SUPABASE_BUCKET}")

if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print(f"DEBUG: Supabase client initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize Supabase client: {e}")
else:
    print(f"DEBUG: Supabase not initialized - missing URL or KEY")

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
    Upload an image file to Supabase Storage and return URLs for different sizes
    """
    if not supabase_client:
        raise HTTPException(
            status_code=500,
            detail="Supabase storage not configured. Please set SUPABASE_URL and SUPABASE_KEY."
        )

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

        # Process and upload all image sizes to Supabase
        sizes = {
            "full": (resize_image(image, (4000, 4000), quality=90), f"full/{base_filename}"),
            "medium": (resize_image(image, MEDIUM_SIZE, quality=85), f"medium/{base_filename}"),
            "thumbnail": (resize_image(image, THUMBNAIL_SIZE, quality=80), f"thumbnails/{base_filename}")
        }

        urls = {}
        for size_name, (image_bytes, storage_path) in sizes.items():
            # Upload to Supabase Storage
            result = supabase_client.storage.from_(settings.SUPABASE_BUCKET).upload(
                path=storage_path,
                file=image_bytes,
                file_options={"content-type": "image/jpeg"}
            )

            # Get public URL
            url_result = supabase_client.storage.from_(settings.SUPABASE_BUCKET).get_public_url(storage_path)
            urls[size_name] = url_result

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
