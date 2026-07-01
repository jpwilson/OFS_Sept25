"""
Utility functions for cleaning up media files from R2 / Supabase Storage
"""
import os
import re
from pathlib import Path
from html.parser import HTMLParser
from typing import Set, List
from supabase import create_client, Client
from ..core.config import settings
from .r2_client import r2_configured, r2_delete


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

    # Match pattern: Cloudflare R2 custom domain
    # https://media.ourfamilysocials.com/{size}/{filename}
    if settings.R2_PUBLIC_DOMAIN and settings.R2_PUBLIC_DOMAIN in url:
        match = re.search(r'/(?:thumbnails|medium|full)/([^/\?#]+)', url)
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

    # Match pattern: Cloudflare R2 custom domain
    # https://media.ourfamilysocials.com/videos/{filename}
    if settings.R2_PUBLIC_DOMAIN and settings.R2_PUBLIC_DOMAIN in url:
        match = re.search(r'/videos/([^/\?#]+)', url)
        if match:
            return match.group(1)

    return None


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

    storage_paths = [
        f"thumbnails/{filename}",
        f"medium/{filename}",
        f"full/{filename}"
    ]

    # R2: delete all three sizes in one call
    if r2_configured():
        try:
            r2_delete(storage_paths)
            result['deleted'].extend(storage_paths)
        except Exception as e:
            result['errors'].append(f"R2 delete failed for {filename}: {str(e)}")
        return result

    try:
        supabase = get_supabase_client()
    except Exception as e:
        result['errors'].append(f"Failed to connect to Supabase: {str(e)}")
        return result

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

    # R2: video lives at videos/{filename}; its thumbnail is a normal image
    # referenced via video_thumbnail_url and cleaned through the image path.
    if r2_configured():
        try:
            r2_delete([f"videos/{filename}"])
            result['deleted'].append(f"videos/{filename}")
        except Exception as e:
            result['errors'].append(f"R2 delete failed for {filename}: {str(e)}")
        return result

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
    Delete all images and videos associated with an event from cloud storage

    Args:
        event: Event model instance

    Returns:
        Dict with cleanup summary: {
            'image_filenames_found': 3,
            'video_filenames_found': 1,
            'files_deleted': 9,
            'files_not_found': 0,
            'errors': [],
            'details': [...]
        }
    """
    print(f"Starting cleanup for event {event.id}")

    # Get image filenames (from Supabase) - wrapped in try/except
    try:
        image_filenames = get_all_event_image_filenames(event)
    except Exception as e:
        print(f"Error getting image filenames: {e}")
        image_filenames = set()

    # Get Supabase video filenames from HTML (legacy videos)
    supabase_video_filenames = set()
    try:
        if event.description:
            supabase_video_filenames = extract_video_filenames_from_html(event.description)
    except Exception as e:
        print(f"Error extracting Supabase video filenames: {e}")

    # Also get videos from images table (if available)
    try:
        if hasattr(event, 'images'):
            for event_image in event.images:
                if hasattr(event_image, 'media_type') and event_image.media_type == 'video':
                    if event_image.image_url:  # Videos stored in image_url field
                        filename = extract_video_filename_from_url(event_image.image_url)
                        if filename:
                            supabase_video_filenames.add(filename)
    except Exception as e:
        print(f"Error extracting videos from event_images table: {e}")

    summary = {
        'image_filenames_found': len(image_filenames),
        'video_filenames_found': len(supabase_video_filenames),
        'files_deleted': 0,
        'files_not_found': 0,
        'errors': [],
        'details': []
    }

    # Delete images from Supabase
    for filename in image_filenames:
        try:
            result = delete_image_files(filename)
            summary['files_deleted'] += len(result['deleted'])
            summary['files_not_found'] += len(result['not_found'])
            summary['errors'].extend(result['errors'])
            summary['details'].append({
                'type': 'image',
                'filename': filename,
                'result': result
            })
        except Exception as e:
            print(f"Error deleting image {filename}: {e}")
            summary['errors'].append(f"Failed to delete image {filename}: {e}")

    # Delete Supabase videos (legacy)
    for filename in supabase_video_filenames:
        try:
            result = delete_video_files(filename)
            summary['files_deleted'] += len(result['deleted'])
            summary['files_not_found'] += len(result['not_found'])
            summary['errors'].extend(result['errors'])
            summary['details'].append({
                'type': 'supabase_video',
                'filename': filename,
                'result': result
            })
        except Exception as e:
            print(f"Error deleting Supabase video {filename}: {e}")
            summary['errors'].append(f"Failed to delete Supabase video {filename}: {e}")

    print(f"Cleanup complete for event {event.id}: {summary['files_deleted']} deleted, {len(summary['errors'])} errors")
    return summary
