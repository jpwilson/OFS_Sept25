from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import secrets
from datetime import datetime, timedelta


class ShareToken(Base):
    __tablename__ = "share_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Optional: who the link was sent to (for tracking)
    sent_to_email = Column(String(255), nullable=True)

    # Expiration
    expires_at = Column(DateTime, nullable=False)

    # Usage tracking
    views = Column(Integer, default=0)
    last_viewed_at = Column(DateTime, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    event = relationship("Event", backref="share_tokens")
    created_by = relationship("User", backref="created_share_tokens")

    @classmethod
    def generate_token(cls):
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)

    @classmethod
    def create_for_event(cls, event_id: int, user_id: int, days_valid: int = 7, sent_to_email: str = None):
        """Create a new share token for an event"""
        return cls(
            token=cls.generate_token(),
            event_id=event_id,
            created_by_id=user_id,
            sent_to_email=sent_to_email,
            expires_at=datetime.utcnow() + timedelta(days=days_valid)
        )

    def is_valid(self) -> bool:
        """Check if token is still valid"""
        return self.is_active and datetime.utcnow() < self.expires_at

    def record_view(self):
        """Record a view of this share link"""
        self.views += 1
        self.last_viewed_at = datetime.utcnow()
