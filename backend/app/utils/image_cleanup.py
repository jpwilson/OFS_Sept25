"""
Utility functions for cleaning up image files from Supabase Storage and videos from Cloudinary
"""
import os
import re
import requests
from pathlib import Path
from html.parser import HTMLParser
from typing import Set, List
from supabase import create_client, Client
from ..core.config import settings


def get_supabase_client() -> Client:
    """Get Supabase client for storage operations"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise Exception("Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY.")

    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_KEY
    )


class MediaExtractor(HTMLParser):
    """Parse HTML to extract image and video URLs"""

    def __init__(self):
        super().__init__()
        self.image_urls = []
        self.video_urls = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'img':
            src = attrs_dict.get('src')
            if src:
                self.image_urls.append(src)
        elif tag == 'video':
            src = attrs_dict.get('src')
            if src:
                self.video_urls.append(src)


def extract_filename_from_url(url: str) -> str | None:
    """
    Extract filename from upload URL (supports both local and Supabase Storage URLs)

    Examples:
        /uploads/medium/abc123.jpg -> abc123.jpg
        http://localhost:8000/uploads/full/xyz789.jpg -> xyz789.jpg
        https://xxx.supabase.co/storage/v1/object/public/event-images/medium/abc123.jpg -> abc123.jpg

    Args:
        url: Image URL (absolute or relative)

    Returns:
        Filename (e.g., 'abc123.jpg') or None if not an upload URL
    """
    if not url:
        return None

    # Match pattern: /uploads/{size}/{filename} (local uploads)
    match = re.search(r'/uploads/(?:thumbnails|medium|full)/([^/\?#]+)', url)
    if match:
        return match.group(1)

    # Match pattern: Supabase Storage URL
    # https://xxx.supabase.co/storage/v1/object/public/{bucket}/{size}/{filename}
    match = re.search(r'/storage/v1/object/public/[^/]+/(?:thumbnails|medium|full)/([^/\?#]+)', url)
    if match:
        return match.group(1)

    return None


def extract_video_filename_from_url(url: str) -> str | None:
    """
    Extract filename from video URL (Supabase Storage URLs)

    Examples:
        https://xxx.supabase.co/storage/v1/object/public/event-videos/abc123.mp4 -> abc123.mp4

    Args:
        url: Video URL

    Returns:
        Filename (e.g., 'abc123.mp4') or None if not a video URL
    """
    if not url:
        return None

    # Match pattern: Supabase Storage URL for videos
    # https://xxx.supabase.co/storage/v1/object/public/event-videos/{filename}
    match = re.search(r'/storage/v1/object/public/event-videos/([^/\?#]+)', url)
    if match:
        return match.group(1)

    return None


def extract_cloudinary_public_id(url: str) -> str | None:
    """
    Extract Cloudinary public ID from video URL

    Examples:
        https://res.cloudinary.com/dejjei389/video/upload/q_auto,f_auto/ofs/videos/abc123 -> ofs/videos/abc123
        https://res.cloudinary.com/dejjei389/video/upload/ofs/videos/xyz789.mp4 -> ofs/videos/xyz789

    Args:
        url: Cloudinary video URL

    Returns:
        Public ID (e.g., 'ofs/videos/abc123') or None if not a Cloudinary URL
    """
    if not url:
        return None

    # Match pattern: https://res.cloudinary.com/{cloud_name}/video/upload/{transformations}/{public_id}
    # Public ID may or may not include file extension
    match = re.search(r'cloudinary\.com/[^/]+/video/upload/(?:[^/]+/)*(.+?)(?:\.\w+)?(?:\?|$)', url)
    if match:
        public_id = match.group(1)
        # Remove any remaining query parameters or fragments
        public_id = re.sub(r'[?#].*$', '', public_id)
        return public_id

    return None


def delete_cloudinary_video(public_id: str) -> dict:
    """
    Delete a video from Cloudinary using Admin API

    Note: Requires CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in settings

    Args:
        public_id: Cloudinary public ID (e.g., 'ofs/videos/abc123')

    Returns:
        Dict with deletion result: {
            'deleted': bool,
            'public_id': str,
            'error': str | None
        }
    """
    result = {
        'deleted': False,
        'public_id': public_id,
        'error': None
    }

    # Check if Cloudinary credentials are configured
    cloudinary_cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
    cloudinary_api_key = getattr(settings, 'CLOUDINARY_API_KEY', None)
    cloudinary_api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', None)

    if not all([cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret]):
        result['error'] = 'Cloudinary credentials not configured'
        print(f"Warning: Cannot delete Cloudinary video {public_id} - credentials not set")
        return result

    try:
        # Use Cloudinary Admin API to delete video
        # https://cloudinary.com/documentation/admin_api#delete_resources
        url = f"https://api.cloudinary.com/v1_1/{cloudinary_cloud_name}/resources/video/upload"

        response = requests.delete(
            url,
            params={'public_ids': public_id},
            auth=(cloudinary_api_key, cloudinary_api_secret)
        )

        if response.status_code == 200:
            result['deleted'] = True
            print(f"Successfully deleted Cloudinary video: {public_id}")
        else:
            result['error'] = f"Cloudinary API error: {response.status_code} - {response.text}"
            print(f"Failed to delete Cloudinary video {public_id}: {result['error']}")

    except Exception as e:
        result['error'] = str(e)
        print(f"Exception deleting Cloudinary video {public_id}: {e}")

    return result


def extract_image_filenames_from_html(html_content: str) -> Set[str]:
    """
    Extract all image filenames from HTML content

    Args:
        html_content: HTML string containing <img> tags

    Returns:
        Set of filenames (e.g., {'abc123.jpg', 'xyz789.jpg'})
    """
    if not html_content:
        return set()

    parser = MediaExtractor()
    try:
        parser.feed(html_content)
    except Exception as e:
        print(f"Error parsing HTML for images: {e}")
        return set()

    filenames = set()
    for url in parser.image_urls:
        filename = extract_filename_from_url(url)
        if filename:
            filenames.add(filename)

    return filenames


def extract_video_filenames_from_html(html_content: str) -> Set[str]:
    """
    Extract all video filenames from HTML content (for Supabase videos)

    Args:
        html_content: HTML string containing <video> tags

    Returns:
        Set of filenames (e.g., {'abc123.mp4', 'xyz789.mov'})
    """
    if not html_content:
        return set()

    parser = MediaExtractor()
    try:
        parser.feed(html_content)
    except Exception as e:
        print(f"Error parsing HTML for videos: {e}")
        return set()

    filenames = set()
    for url in parser.video_urls:
        filename = extract_video_filename_from_url(url)
        if filename:
            filenames.add(filename)

    return filenames


def extract_cloudinary_public_ids_from_html(html_content: str) -> Set[str]:
    """
    Extract all Cloudinary public IDs from HTML content

    Args:
        html_content: HTML string containing <video> tags with Cloudinary URLs

    Returns:
        Set of public IDs (e.g., {'ofs/videos/abc123', 'ofs/videos/xyz789'})
    """
    if not html_content:
        return set()

    parser = MediaExtractor()
    try:
        parser.feed(html_content)
    except Exception as e:
        print(f"Error parsing HTML for Cloudinary videos: {e}")
        return set()

    public_ids = set()
    for url in parser.video_urls:
        public_id = extract_cloudinary_public_id(url)
        if public_id:
            public_ids.add(public_id)

    return public_ids


def get_all_event_image_filenames(event) -> Set[str]:
    """
    Get all image filenames associated with an event

    Args:
        event: Event model instance

    Returns:
        Set of filenames to delete
    """
    filenames = set()

    # Extract from cover image
    if event.cover_image_url:
        filename = extract_filename_from_url(event.cover_image_url)
        if filename:
            filenames.add(filename)

    # Extract from description HTML
    if event.description:
        html_filenames = extract_image_filenames_from_html(event.description)
        filenames.update(html_filenames)

    return filenames


def delete_image_files(filename: str) -> dict:
    """
    Delete an image file from all size directories in Supabase Storage

    Args:
        filename: Image filename (e.g., 'abc123.jpg')

    Returns:
        Dict with deletion results: {
            'deleted': ['thumbnails/abc123.jpg', ...],
            'not_found': ['medium/abc123.jpg'],
            'errors': []
        }
    """
    result = {
        'deleted': [],
        'not_found': [],
        'errors': []
    }

    try:
        supabase = get_supabase_client()
    except Exception as e:
        result['errors'].append(f"Failed to connect to Supabase: {str(e)}")
        return result

    # Storage paths in Supabase
    storage_paths = [
        f"thumbnails/{filename}",
        f"medium/{filename}",
        f"full/{filename}"
    ]

    for storage_path in storage_paths:
        try:
            # Delete from Supabase Storage
            supabase.storage.from_(settings.SUPABASE_BUCKET).remove([storage_path])
            result['deleted'].append(storage_path)
        except Exception as e:
            # If file doesn't exist, Supabase may throw an error or return success
            # We'll treat errors as "not found" unless it's a different error
            error_msg = str(e).lower()
            if 'not found' in error_msg or 'does not exist' in error_msg:
                result['not_found'].append(storage_path)
            else:
                result['errors'].append(f"{storage_path}: {str(e)}")

    return result


def delete_video_files(filename: str) -> dict:
    """
    Delete a video file from Supabase Storage

    Args:
        filename: Video filename (e.g., 'abc123.mp4')

    Returns:
        Dict with deletion results: {
            'deleted': ['abc123.mp4', 'abc123-thumb.jpg'],
            'not_found': [],
            'errors': []
        }
    """
    result = {
        'deleted': [],
        'not_found': [],
        'errors': []
    }

    try:
        supabase = get_supabase_client()
    except Exception as e:
        result['errors'].append(f"Failed to connect to Supabase: {str(e)}")
        return result

    # Delete video file
    try:
        supabase.storage.from_(settings.SUPABASE_VIDEO_BUCKET).remove([filename])
        result['deleted'].append(filename)
    except Exception as e:
        error_msg = str(e).lower()
        if 'not found' in error_msg or 'does not exist' in error_msg:
            result['not_found'].append(filename)
        else:
            result['errors'].append(f"{filename}: {str(e)}")

    # Delete video thumbnail (stored in images bucket with -thumb suffix)
    thumb_filename = filename.rsplit('.', 1)[0] + '-thumb.jpg'
    try:
        supabase.storage.from_(settings.SUPABASE_BUCKET).remove([f"thumbnails/{thumb_filename}"])
        result['deleted'].append(thumb_filename)
    except Exception as e:
        error_msg = str(e).lower()
        if 'not found' in error_msg or 'does not exist' in error_msg:
            result['not_found'].append(thumb_filename)
        else:
            result['errors'].append(f"{thumb_filename}: {str(e)}")

    return result


def cleanup_event_images(event) -> dict:
    """
    Delete all images and videos associated with an event (from both Supabase and Cloudinary)

    Args:
        event: Event model instance

    Returns:
        Dict with cleanup summary: {
            'image_filenames_found': 3,
            'supabase_video_filenames_found': 1,
            'cloudinary_videos_found': 2,
            'files_deleted': 9,
            'files_not_found': 0,
            'errors': [],
            'details': [...]
        }
    """
    # Get image filenames (from Supabase)
    image_filenames = get_all_event_image_filenames(event)

    # Get Supabase video filenames from HTML (legacy videos)
    supabase_video_filenames = set()
    if event.description:
        supabase_video_filenames = extract_video_filenames_from_html(event.description)

    # Get Cloudinary public IDs from HTML (new Cloudinary videos)
    cloudinary_public_ids = set()
    if event.description:
        cloudinary_public_ids = extract_cloudinary_public_ids_from_html(event.description)

    # Also get videos from event_images table (if available)
    try:
        if hasattr(event, 'event_images'):
            for event_image in event.event_images:
                if hasattr(event_image, 'media_type') and event_image.media_type == 'video':
                    if event_image.image_url:  # Videos stored in image_url field
                        # Check if it's a Supabase or Cloudinary URL
                        filename = extract_video_filename_from_url(event_image.image_url)
                        if filename:
                            supabase_video_filenames.add(filename)

                        public_id = extract_cloudinary_public_id(event_image.image_url)
                        if public_id:
                            cloudinary_public_ids.add(public_id)
    except Exception as e:
        print(f"Error extracting videos from event_images table: {e}")

    summary = {
        'image_filenames_found': len(image_filenames),
        'supabase_video_filenames_found': len(supabase_video_filenames),
        'cloudinary_videos_found': len(cloudinary_public_ids),
        'files_deleted': 0,
        'files_not_found': 0,
        'errors': [],
        'details': []
    }

    # Delete images from Supabase
    for filename in image_filenames:
        result = delete_image_files(filename)
        summary['files_deleted'] += len(result['deleted'])
        summary['files_not_found'] += len(result['not_found'])
        summary['errors'].extend(result['errors'])
        summary['details'].append({
            'type': 'image',
            'filename': filename,
            'result': result
        })

    # Delete Supabase videos (legacy)
    for filename in supabase_video_filenames:
        result = delete_video_files(filename)
        summary['files_deleted'] += len(result['deleted'])
        summary['files_not_found'] += len(result['not_found'])
        summary['errors'].extend(result['errors'])
        summary['details'].append({
            'type': 'supabase_video',
            'filename': filename,
            'result': result
        })

    # Delete Cloudinary videos (new)
    for public_id in cloudinary_public_ids:
        result = delete_cloudinary_video(public_id)
        if result['deleted']:
            summary['files_deleted'] += 1
        elif result['error']:
            summary['errors'].append(result['error'])
        summary['details'].append({
            'type': 'cloudinary_video',
            'public_id': public_id,
            'result': result
        })

    return summary
