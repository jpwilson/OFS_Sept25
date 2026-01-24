from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Feedback content
    feedback_type = Column(String(50), nullable=False)  # bug, feature, general
    message = Column(Text, nullable=False)

    # Context for debugging
    page_url = Column(String(500), nullable=True)
    user_agent = Column(String(500), nullable=True)
    screen_size = Column(String(50), nullable=True)  # e.g., "375x812"
    is_mobile = Column(Boolean, default=False)

    # Optional attachment (Cloudinary URL)
    attachment_url = Column(String(500), nullable=True)

    # Status tracking
    status = Column(String(50), default="new")  # new, reviewed, resolved
    admin_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", backref="feedback_submissions")
