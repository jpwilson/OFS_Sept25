from pydantic import BaseModel, EmailStr, model_validator
from datetime import datetime
from typing import Optional, Any

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

    @model_validator(mode='before')
    @classmethod
    def compute_method_fields(cls, data: Any) -> Any:
        """Convert method calls to values for User model objects"""
        # If data is a SQLAlchemy model, call the methods
        if hasattr(data, 'is_within_first_5_days') and callable(data.is_within_first_5_days):
            # It's a User model object, call the methods
            return {
                'id': data.id,
                'email': data.email,
                'username': data.username,
                'full_name': data.full_name,
                'avatar_url': data.avatar_url,
                'bio': data.bio,
                'is_active': data.is_active,
                'created_at': data.created_at,
                'subscription_tier': data.subscription_tier,
                'subscription_status': data.subscription_status,
                'trial_end_date': data.trial_end_date,
                'trial_days_remaining': data.get_trial_days_remaining() if hasattr(data, 'get_trial_days_remaining') else None,
                'is_within_first_5_days': data.is_within_first_5_days(),
                'can_access_content': data.can_access_content(),
            }
        return data

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
