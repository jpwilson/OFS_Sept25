from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class EventTag(Base):
    """
    Links an event to a tagged person (either a user or a tag profile).
    Users must approve tags (pending -> accepted/rejected).
    Tag profiles are auto-accepted since they're non-users.
    """
    __tablename__ = "event_tags"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)

    # Either user OR profile (not both) - enforced by constraint
    tagged_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    tag_profile_id = Column(Integer, ForeignKey("tag_profiles.id", ondelete="CASCADE"), nullable=True)

    tagged_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="pending")  # 'pending', 'accepted', 'rejected'

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "(tagged_user_id IS NOT NULL AND tag_profile_id IS NULL) OR "
            "(tagged_user_id IS NULL AND tag_profile_id IS NOT NULL)",
            name="check_one_tagged"
        ),
    )

    # Relationships
    event = relationship("Event", backref="event_tags")
    tagged_user = relationship("User", foreign_keys=[tagged_user_id], backref="tagged_in")
    tag_profile = relationship("TagProfile", back_populates="event_tags")
    tagged_by = relationship("User", foreign_keys=[tagged_by_id])
