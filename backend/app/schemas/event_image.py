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

class EventImageCreate(BaseModel):
    event_id: int
    caption: Optional[str] = None
    order_index: int = 0
    alt_text: Optional[str] = None

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
