"""
Utility functions for validating location markers in event content
"""
import re
from html.parser import HTMLParser
from datetime import datetime


class LocationMarkerParser(HTMLParser):
    """Parse HTML to extract location markers"""

    def __init__(self):
        super().__init__()
        self.location_count = 0
        self.locations = []

    def handle_starttag(self, tag, attrs):
        # Check if this is a location marker span
        if tag == 'span':
            attrs_dict = dict(attrs)
            if 'data-location-marker' in attrs_dict:
                self.location_count += 1

                # Extract location data from attributes
                location_data = {
                    'location_name': attrs_dict.get('data-location-name', 'Unknown Location'),
                    'latitude': float(attrs_dict.get('data-latitude', 0)),
                    'longitude': float(attrs_dict.get('data-longitude', 0)),
                    'timestamp': attrs_dict.get('data-timestamp'),
                    'place_id': attrs_dict.get('data-place-id'),
                    'order_index': self.location_count - 1
                }
                self.locations.append(location_data)


def count_location_markers(html_content: str) -> int:
    """
    Count the number of location markers in HTML content

    Args:
        html_content: HTML string containing potential location markers

    Returns:
        Number of location markers found
    """
    if not html_content:
        return 0

    parser = LocationMarkerParser()
    try:
        parser.feed(html_content)
    except Exception:
        # If parsing fails, fall back to regex
        return len(re.findall(r'data-location-marker', html_content))

    return parser.location_count


def validate_location_count(html_content: str, max_locations: int = 20) -> tuple[bool, int]:
    """
    Validate that the number of location markers doesn't exceed the maximum

    Args:
        html_content: HTML string containing potential location markers
        max_locations: Maximum number of locations allowed (default: 20)

    Returns:
        Tuple of (is_valid, location_count)
    """
    count = count_location_markers(html_content)
    return (count <= max_locations, count)


def extract_location_markers(html_content: str) -> list[dict]:
    """
    Extract all location markers from HTML content

    Args:
        html_content: HTML string containing location markers

    Returns:
        List of location dictionaries with keys: location_name, latitude, longitude, timestamp, place_id, order_index
    """
    if not html_content:
        return []

    parser = LocationMarkerParser()
    try:
        parser.feed(html_content)
    except Exception as e:
        print(f"Error parsing HTML for locations: {e}")
        return []

    return parser.locations
