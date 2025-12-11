from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="pending", nullable=False)  # 'pending', 'accepted', 'rejected'
    is_close_family = Column(Boolean, default=False, nullable=False)  # Mark as close family member
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Invited viewer fields
    invited_viewer_follow = Column(Boolean, default=False)  # True if auto-created from invitation
    invitation_id = Column(Integer, ForeignKey("invited_viewers.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")
    invitation = relationship("InvitedViewer")
