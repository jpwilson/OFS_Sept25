from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EventLocationBase(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    location_type: str  # 'manual', 'exif', 'inline_marker'
    timestamp: Optional[datetime] = None
    order_index: int = 0
    section_id: Optional[str] = None
    section_title: Optional[str] = None
    additional_data: Optional[str] = None  # JSON string

class EventLocationCreate(EventLocationBase):
    pass

class EventLocationUpdate(BaseModel):
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[datetime] = None
    order_index: Optional[int] = None
    section_id: Optional[str] = None
    section_title: Optional[str] = None
    additional_data: Optional[str] = None

class EventLocation(EventLocationBase):
    id: int
    event_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
