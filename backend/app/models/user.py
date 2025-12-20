from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
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
    subscription_tier = Column(String, default='free')  # 'free', 'premium', 'family'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Subscription & Trial fields
    trial_start_date = Column(DateTime, nullable=True)
    trial_end_date = Column(DateTime, nullable=True)
    subscribed_within_5_days = Column(Boolean, default=False)
    subscription_started_at = Column(DateTime, nullable=True)
    subscription_ends_at = Column(DateTime, nullable=True)
    stripe_customer_id = Column(String, unique=True, nullable=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    subscription_status = Column(String, default='trial')  # 'trial', 'active', 'canceled', 'expired'

    # Email notification preferences (all enabled by default)
    email_notifications_enabled = Column(Boolean, default=True)  # Master toggle
    notify_new_follower = Column(Boolean, default=True)
    notify_new_comment = Column(Boolean, default=True)
    notify_trial_reminder = Column(Boolean, default=True)
    notify_event_shared = Column(Boolean, default=True)  # When someone views your shared event
    notify_new_event_from_followed = Column(Boolean, default=True)  # When someone you follow posts an event
    notify_invitee_new_event = Column(Boolean, default=True)  # Receive notifications from people who invited you
    notify_tag_request = Column(Boolean, default=True)  # Receive notifications when tagged in events

    # Invited Viewer fields
    is_invited_viewer = Column(Boolean, default=False)  # True if signed up via invitation
    invited_viewer_mode = Column(Boolean, default=False)  # True when in restricted mode (after trial)

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

    # Invited viewers (people this user has invited)
    sent_invitations = relationship("InvitedViewer", foreign_keys="InvitedViewer.inviter_id", back_populates="inviter", cascade="all, delete-orphan")

    # Media engagement
    media_likes = relationship("MediaLike", back_populates="user", cascade="all, delete-orphan")
    media_comments = relationship("MediaComment", back_populates="author", cascade="all, delete-orphan")

    # Subscription helper methods
    def get_trial_status(self):
        """Returns 'active', 'expired', or 'never_started'"""
        if not self.trial_start_date:
            return 'never_started'

        now = datetime.utcnow()
        if self.trial_end_date and now <= self.trial_end_date:
            return 'active'
        return 'expired'

    def get_trial_days_remaining(self):
        """Returns days remaining in trial, or 0 if expired/never started"""
        if not self.trial_end_date:
            return 0

        now = datetime.utcnow()
        if now > self.trial_end_date:
            return 0

        delta = self.trial_end_date - now
        return delta.days + 1  # +1 to include current day

    def is_within_first_5_days(self):
        """Check if user is within first 5 days of trial"""
        if not self.trial_start_date:
            return False

        now = datetime.utcnow()
        delta = now - self.trial_start_date
        return delta.days < 5

    def has_active_subscription(self):
        """Check if user has active paid subscription"""
        return self.subscription_status == 'active' and self.subscription_tier in ['premium', 'family']

    def can_access_content(self):
        """Check if user can access protected content (event details, etc.)"""
        # Active paid subscription
        if self.has_active_subscription():
            return True

        # Trial still active
        trial_status = self.get_trial_status()
        if trial_status == 'active':
            return True

        # Legacy users (signed up before trial system) - grant access
        # They have no trial dates set, so treat as having access
        if trial_status == 'never_started':
            return True

        return False

    def can_view_event(self, event, db) -> bool:
        """Check if user can view a specific event's detail page.

        Expired trial users can only view:
        1. Public events (privacy_level == 'public')
        2. Events from people they follow
        """
        # Full access users can view anything
        if self.can_access_content():
            return True

        # Public events are viewable by everyone
        if event.privacy_level == 'public':
            return True

        # Expired users can view events from people they follow
        from .follow import Follow
        is_following = db.query(Follow).filter(
            Follow.follower_id == self.id,
            Follow.following_id == event.author_id,
            Follow.status == 'accepted'
        ).first() is not None

        return is_following
