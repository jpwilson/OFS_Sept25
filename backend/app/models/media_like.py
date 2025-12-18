from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class MediaLike(Base):
    __tablename__ = "media_likes"

    id = Column(Integer, primary_key=True, index=True)
    event_image_id = Column(Integer, ForeignKey("event_images.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Unique constraint: one like per user per media
    __table_args__ = (
        UniqueConstraint('event_image_id', 'user_id', name='uq_media_like_user'),
    )

    # Relationships
    event_image = relationship("EventImage", back_populates="media_likes")
    user = relationship("User", back_populates="media_likes")
