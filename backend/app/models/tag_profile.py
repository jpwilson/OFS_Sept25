from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Date, CheckConstraint
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

    # Family tree. A NULL precision on a birth date means an exact day.
    birth_date = Column(Date, nullable=True)
    birth_date_precision = Column(String(5), nullable=True)  # 'day', 'month', 'year'
    birthplace = Column(String(120), nullable=True)
    died_on = Column(Date, nullable=True)
    died_on_precision = Column(String(5), nullable=True)  # set exactly when died_on is

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_tag_profiles")
    merged_user = relationship("User", foreign_keys=[merged_user_id])
    event_tags = relationship("EventTag", back_populates="tag_profile", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "birth_date_precision IS NULL OR (birth_date IS NOT NULL AND birth_date_precision IN ('day','month','year'))",
            name="tag_profiles_birth_date_precision_check"),
        CheckConstraint(
            "(died_on IS NULL AND died_on_precision IS NULL)"
            " OR (died_on IS NOT NULL AND died_on_precision IN ('day','month','year'))",
            name="tag_profiles_died_on_precision_check"),
    )
