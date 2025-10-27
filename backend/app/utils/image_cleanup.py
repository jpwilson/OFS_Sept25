"""
Utility functions for cleaning up image files from storage
"""
import os
import re
from pathlib import Path
from html.parser import HTMLParser
from typing import Set, List


# Upload directories (must match upload.py)
UPLOAD_DIR = Path("uploads")
THUMB_DIR = UPLOAD_DIR / "thumbnails"
MEDIUM_DIR = UPLOAD_DIR / "medium"
FULL_DIR = UPLOAD_DIR / "full"


class ImageExtractor(HTMLParser):
    """Parse HTML to extract image URLs"""

    def __init__(self):
        super().__init__()
        self.image_urls = []

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            attrs_dict = dict(attrs)
            src = attrs_dict.get('src')
            if src:
                self.image_urls.append(src)


def extract_filename_from_url(url: str) -> str | None:
    """
    Extract filename from upload URL

    Examples:
        /uploads/medium/abc123.jpg -> abc123.jpg
        http://localhost:8000/uploads/full/xyz789.jpg -> xyz789.jpg

    Args:
        url: Image URL (absolute or relative)

    Returns:
        Filename (e.g., 'abc123.jpg') or None if not an upload URL
    """
    if not url:
        return None

    # Match pattern: /uploads/{size}/{filename}
    match = re.search(r'/uploads/(?:thumbnails|medium|full)/([^/\?#]+)', url)
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

    parser = ImageExtractor()
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
    Delete an image file from all size directories

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

    directories = [
        ('thumbnails', THUMB_DIR),
        ('medium', MEDIUM_DIR),
        ('full', FULL_DIR)
    ]

    for dir_name, dir_path in directories:
        file_path = dir_path / filename

        if not file_path.exists():
            result['not_found'].append(f"{dir_name}/{filename}")
            continue

        try:
            file_path.unlink()
            result['deleted'].append(f"{dir_name}/{filename}")
        except Exception as e:
            result['errors'].append(f"{dir_name}/{filename}: {str(e)}")

    return result


def cleanup_event_images(event) -> dict:
    """
    Delete all images associated with an event

    Args:
        event: Event model instance

    Returns:
        Dict with cleanup summary: {
            'filenames_found': 3,
            'files_deleted': 9,  # 3 filenames × 3 sizes
            'files_not_found': 0,
            'errors': [],
            'details': [...]
        }
    """
    filenames = get_all_event_image_filenames(event)

    summary = {
        'filenames_found': len(filenames),
        'files_deleted': 0,
        'files_not_found': 0,
        'errors': [],
        'details': []
    }

    for filename in filenames:
        result = delete_image_files(filename)
        summary['files_deleted'] += len(result['deleted'])
        summary['files_not_found'] += len(result['not_found'])
        summary['errors'].extend(result['errors'])
        summary['details'].append({
            'filename': filename,
            'result': result
        })

    return summary
