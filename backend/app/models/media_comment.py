from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class MediaComment(Base):
    __tablename__ = "media_comments"

    id = Column(Integer, primary_key=True, index=True)
    event_image_id = Column(Integer, ForeignKey("event_images.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    event_image = relationship("EventImage", back_populates="media_comments")
    author = relationship("User", back_populates="media_comments")
