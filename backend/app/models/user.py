from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)  # Permanent @handle
    display_name = Column(String)  # User-friendly name (can be changed)
    full_name = Column(String)  # Deprecated, use display_name
    hashed_password = Column(String, nullable=True)  # NULL for Supabase Auth users
    auth_user_id = Column(UUID(as_uuid=True), unique=True, nullable=True)  # Supabase auth.users.id
    avatar_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    subscription_tier = Column(String, default='free')  # Legacy: 'free', 'premium', 'family' - deprecated in favor of subscription_status

    # Stripe subscription fields
    stripe_customer_id = Column(String, unique=True, nullable=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    subscription_status = Column(String, default='inactive')  # 'inactive', 'trialing', 'active', 'past_due', 'canceled'
    trial_end_date = Column(DateTime, nullable=True)
    subscription_period_end = Column(DateTime, nullable=True)
    subscription_cancel_at_period_end = Column(Boolean, default=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    events = relationship("Event", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    likes = relationship("Like", back_populates="user")

    # Follow relationships
    following = relationship(
        "Follow",
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan"
    )
    followers = relationship(
        "Follow",
        foreign_keys="Follow.following_id",
        back_populates="following",
        cascade="all, delete-orphan"
    )

    # Custom groups
    custom_groups = relationship("CustomGroup", back_populates="owner", cascade="all, delete-orphan")
    group_memberships = relationship("CustomGroupMember", back_populates="user", cascade="all, delete-orphan")