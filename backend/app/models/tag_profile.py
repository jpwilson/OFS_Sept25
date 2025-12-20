from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class TagProfile(Base):
    """
    A profile for non-users (pets, children, relatives, etc.)
    that can be tagged in events without requiring them to be on the platform.
    """
    __tablename__ = "tag_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    photo_url = Column(Text, nullable=True)

    # Creator and relationship (for deduplication in search)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relationship_to_creator = Column(String(100), nullable=True)  # 'daughter', 'son', 'pet', etc.

    # Merge tracking (when non-user joins the platform)
    merged_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_merged = Column(Boolean, default=False)

    # Future family tree support
    birth_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_tag_profiles")
    merged_user = relationship("User", foreign_keys=[merged_user_id])
    event_tags = relationship("EventTag", back_populates="tag_profile", cascade="all, delete-orphan")
