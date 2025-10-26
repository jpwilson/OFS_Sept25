from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ContentBlockBase(BaseModel):
    type: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    caption: Optional[str] = None
    order: int

class ContentBlockCreate(ContentBlockBase):
    pass

class ContentBlockResponse(ContentBlockBase):
    id: int
    event_id: int

    class Config:
        from_attributes = True

class EventBase(BaseModel):
    title: str
    summary: Optional[str] = None
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cover_image_url: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    cover_image_url: Optional[str] = None
    is_published: Optional[bool] = None

class EventResponse(EventBase):
    id: int
    author_id: int
    author_username: str
    author_full_name: Optional[str]
    view_count: int
    like_count: int
    comment_count: int
    is_published: bool
    created_at: datetime
    updated_at: datetime
    content_blocks: List[ContentBlockResponse] = []

    class Config:
        from_attributes = True