from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EventImageBase(BaseModel):
    event_id: int
    image_url: str
    caption: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[datetime] = None
    order_index: int = 0
    alt_text: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    # Video fields
    media_type: str = 'image'  # 'image' or 'video'
    duration_seconds: Optional[int] = None
    video_thumbnail_url: Optional[str] = None
    # Video processing
    processing_status: str = 'ready'  # 'uploading', 'processing', 'ready'
    original_size: Optional[int] = None
    compressed_size: Optional[int] = None

class EventImageCreate(BaseModel):
    event_id: int
    image_url: str  # Required for metadata-only creation
    caption: Optional[str] = None
    order_index: int = 0
    alt_text: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[datetime] = None
    # Video fields
    media_type: str = 'image'
    duration_seconds: Optional[int] = None
    video_thumbnail_url: Optional[str] = None
    # Video processing
    processing_status: str = 'ready'
    original_size: Optional[int] = None
    compressed_size: Optional[int] = None

class EventImageUpdate(BaseModel):
    caption: Optional[str] = None
    order_index: Optional[int] = None
    alt_text: Optional[str] = None

class EventImageResponse(EventImageBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
