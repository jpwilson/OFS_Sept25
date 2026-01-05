from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


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


# Tag Profile Relationship schemas
class TagProfileRelationshipCreate(BaseModel):
    """Request to add a relationship to a tag profile."""
    user_id: int
    relationship_type: str


class TagProfileRelationshipResponse(BaseModel):
    """A single relationship for a tag profile."""
    id: int
    user_id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    relationship_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class TagProfileResponse(TagProfileBase):
    id: int
    created_by_id: int
    created_by_username: Optional[str] = None
    created_by_display_name: Optional[str] = None
    is_merged: bool = False
    merged_user_id: Optional[int] = None
    created_at: datetime
    relationships: List[TagProfileRelationshipResponse] = []

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


# Tag Profile Claim schemas
class TagProfileClaimCreate(BaseModel):
    """Request to claim a tag profile."""
    tag_profile_id: int
    message: Optional[str] = None


class TagProfileClaimResponse(BaseModel):
    """Claim request response."""
    id: int
    tag_profile_id: int
    tag_profile_name: str
    tag_profile_photo_url: Optional[str] = None
    tag_profile_relationship: Optional[str] = None
    claimant_id: int
    claimant_username: str
    claimant_display_name: Optional[str] = None
    claimant_avatar_url: Optional[str] = None
    message: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TagProfileClaimSentResponse(BaseModel):
    """Claim request response for sent claims (from claimant perspective)."""
    id: int
    tag_profile_id: int
    tag_profile_name: str
    tag_profile_photo_url: Optional[str] = None
    tag_profile_relationship: Optional[str] = None
    profile_creator_id: int
    profile_creator_username: str
    profile_creator_display_name: Optional[str] = None
    message: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# Tag Profile Relationship Request schemas (for non-creators proposing relationships)
class TagProfileRelationshipRequestCreate(BaseModel):
    """Request to add a relationship between a tag profile and the proposer."""
    relationship_type: str
    message: Optional[str] = None


class TagProfileRelationshipRequestResponse(BaseModel):
    """Relationship request from the creator's perspective (received requests)."""
    id: int
    tag_profile_id: int
    tag_profile_name: str
    tag_profile_photo_url: Optional[str] = None
    proposer_id: int
    proposer_username: str
    proposer_display_name: Optional[str] = None
    proposer_avatar_url: Optional[str] = None
    relationship_type: str
    message: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class TagProfileRelationshipRequestSentResponse(BaseModel):
    """Relationship request from the proposer's perspective (sent requests)."""
    id: int
    tag_profile_id: int
    tag_profile_name: str
    tag_profile_photo_url: Optional[str] = None
    profile_creator_id: int
    profile_creator_username: str
    profile_creator_display_name: Optional[str] = None
    relationship_type: str
    message: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
