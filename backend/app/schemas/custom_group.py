from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Custom Group Schemas
class CustomGroupMemberBase(BaseModel):
    user_id: int

class CustomGroupMemberCreate(CustomGroupMemberBase):
    pass

class CustomGroupMember(CustomGroupMemberBase):
    id: int
    group_id: int
    added_at: datetime
    # User details (populated from join)
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class CustomGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class CustomGroupCreate(CustomGroupBase):
    member_ids: Optional[List[int]] = []  # List of user IDs to add as members

class CustomGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CustomGroup(CustomGroupBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    member_count: Optional[int] = None  # Populated in API
    members: Optional[List[CustomGroupMember]] = []  # Optionally populated

    class Config:
        from_attributes = True

class CustomGroupSummary(BaseModel):
    """Lightweight version for dropdowns/lists"""
    id: int
    name: str
    member_count: int

    class Config:
        from_attributes = True
