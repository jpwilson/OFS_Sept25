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

    # Threading support
    parent_id = Column(Integer, ForeignKey("media_comments.id", ondelete="CASCADE"), nullable=True)
    depth = Column(Integer, default=0)  # 0=top-level, 1=reply, 2=reply-to-reply (max)

    # Relationships
    event_image = relationship("EventImage", back_populates="media_comments")
    author = relationship("User", back_populates="media_comments")
    parent = relationship("MediaComment", remote_side=[id], back_populates="replies")
    replies = relationship("MediaComment", back_populates="parent", cascade="all, delete-orphan")
    reactions = relationship("MediaCommentReaction", back_populates="media_comment", cascade="all, delete-orphan")
