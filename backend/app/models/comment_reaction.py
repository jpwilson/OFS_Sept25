from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

REACTION_TYPES = ['heart', 'laugh', 'sad', 'wow', 'love', 'clap', 'fire', 'hundred', 'hug', 'smile']

class CommentReaction(Base):
    __tablename__ = "comment_reactions"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reaction_type = Column(String(20), default='heart', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('comment_id', 'user_id', name='uq_comment_reaction_user'),
    )

    # Relationships
    comment = relationship("Comment", back_populates="reactions")
    user = relationship("User", back_populates="comment_reactions")
