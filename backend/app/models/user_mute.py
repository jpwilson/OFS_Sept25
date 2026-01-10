from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class UserMute(Base):
    __tablename__ = "user_mutes"

    id = Column(Integer, primary_key=True, index=True)
    muter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    muted_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    muter = relationship("User", foreign_keys=[muter_id])
    muted_user = relationship("User", foreign_keys=[muted_user_id])
