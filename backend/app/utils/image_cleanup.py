"""
Utility functions for cleaning up image files from Supabase Storage
"""
import os
import re
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
    Extract all video filenames from HTML content

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
    Delete all images and videos associated with an event

    Args:
        event: Event model instance

    Returns:
        Dict with cleanup summary: {
            'filenames_found': 3,
            'files_deleted': 9,
            'files_not_found': 0,
            'errors': [],
            'details': [...]
        }
    """
    # Get image filenames
    image_filenames = get_all_event_image_filenames(event)

    # Get video filenames from HTML
    video_filenames = set()
    if event.description:
        video_filenames = extract_video_filenames_from_html(event.description)

    # Also get videos from event_images table (if available)
    try:
        if hasattr(event, 'event_images'):
            for event_image in event.event_images:
                if hasattr(event_image, 'media_type') and event_image.media_type == 'video':
                    if event_image.image_url:  # Videos stored in image_url field
                        filename = extract_video_filename_from_url(event_image.image_url)
                        if filename:
                            video_filenames.add(filename)
    except Exception as e:
        print(f"Error extracting videos from event_images table: {e}")

    summary = {
        'image_filenames_found': len(image_filenames),
        'video_filenames_found': len(video_filenames),
        'files_deleted': 0,
        'files_not_found': 0,
        'errors': [],
        'details': []
    }

    # Delete images
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

    # Delete videos
    for filename in video_filenames:
        result = delete_video_files(filename)
        summary['files_deleted'] += len(result['deleted'])
        summary['files_not_found'] += len(result['not_found'])
        summary['errors'].extend(result['errors'])
        summary['details'].append({
            'type': 'video',
            'filename': filename,
            'result': result
        })

    return summary
