from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class ViewerNotificationLog(Base):
    """
    Tracks notifications sent to invited viewers.
    Used for rate limiting: max 1 notification per day per author.
    """
    __tablename__ = "viewer_notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    viewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    viewer = relationship("User", foreign_keys=[viewer_id])
    author = relationship("User", foreign_keys=[event_author_id])
    event = relationship("Event")
