import re
import unicodedata
from sqlalchemy.orm import Session


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug.

    - Converts to lowercase
    - Removes accents/diacritics
    - Replaces spaces and special chars with hyphens
    - Removes consecutive hyphens
    - Strips leading/trailing hyphens
    """
    # Normalize unicode characters (e.g., é -> e)
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')

    # Convert to lowercase
    text = text.lower()

    # Replace spaces and underscores with hyphens
    text = re.sub(r'[\s_]+', '-', text)

    # Remove all non-alphanumeric characters except hyphens
    text = re.sub(r'[^a-z0-9-]', '', text)

    # Remove consecutive hyphens
    text = re.sub(r'-+', '-', text)

    # Strip leading/trailing hyphens
    text = text.strip('-')

    return text


def generate_unique_slug(title: str, db: Session, event_id: int = None) -> str:
    """Generate a unique slug for an event.

    If the slug already exists, appends a number suffix.
    event_id is used to exclude the current event when updating.
    """
    from ..models.event import Event

    base_slug = slugify(title)

    # Ensure slug isn't empty
    if not base_slug:
        base_slug = 'event'

    # Truncate to reasonable length (keeping room for suffix)
    base_slug = base_slug[:80]

    slug = base_slug
    counter = 1

    while True:
        # Check if slug exists (excluding current event if updating)
        query = db.query(Event).filter(Event.slug == slug)
        if event_id:
            query = query.filter(Event.id != event_id)

        existing = query.first()
        if not existing:
            return slug

        # Add suffix and try again
        slug = f"{base_slug}-{counter}"
        counter += 1

        # Safety limit
        if counter > 1000:
            # Fallback to using timestamp
            import time
            return f"{base_slug}-{int(time.time())}"
