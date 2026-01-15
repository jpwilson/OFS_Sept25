from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, String
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

# Valid reaction types
REACTION_TYPES = ['heart', 'laugh', 'sad', 'wow', 'love', 'clap', 'fire', 'hundred', 'hug', 'smile']

class MediaLike(Base):
    __tablename__ = "media_likes"

    id = Column(Integer, primary_key=True, index=True)
    event_image_id = Column(Integer, ForeignKey("event_images.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction_type = Column(String(20), default='heart', nullable=False)  # heart, laugh, sad, wow, love, clap, fire, hundred, hug, smile
    created_at = Column(DateTime, default=datetime.utcnow)

    # Unique constraint: one like per user per media
    __table_args__ = (
        UniqueConstraint('event_image_id', 'user_id', name='uq_media_like_user'),
    )

    # Relationships
    event_image = relationship("EventImage", back_populates="media_likes")
    user = relationship("User", back_populates="media_likes")
