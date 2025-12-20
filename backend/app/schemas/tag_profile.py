from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class TagProfileBase(BaseModel):
    name: str
    relationship_to_creator: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[date] = None


class TagProfileCreate(TagProfileBase):
    pass


class TagProfileUpdate(BaseModel):
    name: Optional[str] = None
    relationship_to_creator: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[date] = None


class TagProfileResponse(TagProfileBase):
    id: int
    created_by_id: int
    created_by_username: Optional[str] = None
    created_by_display_name: Optional[str] = None
    is_merged: bool = False
    merged_user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TagProfileSearchResult(BaseModel):
    """Search result showing tag profile with context for deduplication."""
    id: int
    name: str
    photo_url: Optional[str] = None
    relationship_to_creator: Optional[str] = None
    created_by_id: int
    created_by_username: str
    created_by_display_name: Optional[str] = None
    is_following_creator: bool = False  # Whether searcher follows the creator

    class Config:
        from_attributes = True
