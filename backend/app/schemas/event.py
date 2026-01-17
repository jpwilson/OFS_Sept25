from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from .event_location import EventLocation
from .event_image import EventImageResponse

class ContentBlockBase(BaseModel):
    content_type: str  # 'text', 'image', 'video'
    content: str
    order_index: int = 0

class ContentBlockCreate(ContentBlockBase):
    pass

class ContentBlockResponse(ContentBlockBase):
    id: int
    event_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GPSLocation(BaseModel):
    latitude: float
    longitude: float
    timestamp: Optional[str] = None
    image_url: Optional[str] = None

class EventBase(BaseModel):
    title: str
    short_title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cover_image_url: Optional[str] = None
    has_multiple_locations: bool = False
    privacy_level: str = "public"  # 'public', 'followers', 'close_family', 'custom_group', 'private'
    category: Optional[str] = None
    category_2: Optional[str] = None  # Secondary category (optional)
    custom_group_id: Optional[int] = None

class EventCreate(EventBase):
    gps_locations: Optional[List[GPSLocation]] = []

class EventUpdate(BaseModel):
    title: Optional[str] = None
    short_title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cover_image_url: Optional[str] = None
    has_multiple_locations: Optional[bool] = None
    is_published: Optional[bool] = None
    privacy_level: Optional[str] = None
    category: Optional[str] = None
    category_2: Optional[str] = None
    custom_group_id: Optional[int] = None
    gps_locations: Optional[List[GPSLocation]] = []

class EventResponse(EventBase):
    id: int
    slug: Optional[str] = None
    author_id: int
    author_username: str
    author_full_name: Optional[str]
    view_count: int
    like_count: int
    comment_count: int
    is_published: bool
    privacy_level: str
    category: Optional[str] = None
    category_2: Optional[str] = None
    custom_group_id: Optional[int] = None
    share_enabled: bool = False
    share_expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    content_blocks: List[ContentBlockResponse] = []
    locations: List[EventLocation] = []
    event_images: List[EventImageResponse] = []  # Include images with captions

    class Config:
        from_attributes = True

class ShareLinkCreate(BaseModel):
    expires_in_days: int  # 1-5 days

class ShareLinkResponse(BaseModel):
    share_token: str
    share_url: str
    expires_at: datetime
    view_count: int
    shared_on: Optional[datetime] = None