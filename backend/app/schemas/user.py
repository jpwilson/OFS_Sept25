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

    # Subscription fields
    subscription_tier: Optional[str] = 'free'  # Legacy field
    subscription_status: Optional[str] = 'inactive'  # Current: inactive, trialing, active, past_due, canceled
    trial_end_date: Optional[datetime] = None
    subscription_period_end: Optional[datetime] = None
    subscription_cancel_at_period_end: Optional[bool] = False

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse