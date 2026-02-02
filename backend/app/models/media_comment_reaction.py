from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

REACTION_TYPES = ['heart', 'laugh', 'sad', 'wow', 'love', 'clap', 'fire', 'hundred', 'hug', 'smile']

class MediaCommentReaction(Base):
    __tablename__ = "media_comment_reactions"

    id = Column(Integer, primary_key=True, index=True)
    media_comment_id = Column(Integer, ForeignKey("media_comments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction_type = Column(String(20), default='heart', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('media_comment_id', 'user_id', name='uq_media_comment_reaction_user'),
    )

    # Relationships
    media_comment = relationship("MediaComment", back_populates="reactions")
    user = relationship("User", back_populates="media_comment_reactions")
