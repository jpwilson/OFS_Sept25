from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    created_at: datetime
    subscription_tier: Optional[str] = 'free'
    subscription_status: Optional[str] = 'trial'
    trial_end_date: Optional[datetime] = None
    trial_days_remaining: Optional[int] = None
    is_within_first_5_days: Optional[bool] = False
    can_access_content: Optional[bool] = True

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
