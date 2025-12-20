from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class EventTagBase(BaseModel):
    pass


class EventTagCreate(BaseModel):
    """For adding a tag to an event. Provide either user_id or profile_id, not both."""
    user_id: Optional[int] = None  # For tagging existing users
    profile_id: Optional[int] = None  # For tagging tag profiles


class EventTagBulkCreate(BaseModel):
    """For adding multiple tags at once."""
    tags: List[EventTagCreate]


class EventTagResponse(BaseModel):
    id: int
    event_id: int
    tagged_by_id: int
    status: str  # 'pending', 'accepted', 'rejected'
    created_at: datetime

    # One of these will be populated
    tagged_user_id: Optional[int] = None
    tag_profile_id: Optional[int] = None

    # User info (if tagged_user_id is set)
    tagged_user_username: Optional[str] = None
    tagged_user_display_name: Optional[str] = None
    tagged_user_avatar_url: Optional[str] = None

    # Tag profile info (if tag_profile_id is set)
    tag_profile_name: Optional[str] = None
    tag_profile_photo_url: Optional[str] = None
    tag_profile_relationship: Optional[str] = None
    tag_profile_created_by_username: Optional[str] = None

    class Config:
        from_attributes = True


class TagRequestResponse(BaseModel):
    """Tag request shown in notifications."""
    id: int
    event_id: int
    event_title: str
    event_cover_image_url: Optional[str] = None
    tagged_by_id: int
    tagged_by_username: str
    tagged_by_display_name: Optional[str] = None
    tagged_by_avatar_url: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SearchableTagTarget(BaseModel):
    """Combined search result for users and tag profiles."""
    type: str  # 'user' or 'profile'

    # Common fields
    id: int
    name: str  # username for users, name for profiles
    display_name: Optional[str] = None  # display_name for users, None for profiles
    photo_url: Optional[str] = None

    # Profile-specific
    relationship_to_creator: Optional[str] = None
    created_by_username: Optional[str] = None

    # User-specific
    username: Optional[str] = None

    class Config:
        from_attributes = True
