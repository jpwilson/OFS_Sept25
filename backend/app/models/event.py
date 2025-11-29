from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    short_title = Column(String, nullable=True)  # Optional shortened title for mobile display
    summary = Column(String, nullable=True)  # Short description for cards
    description = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    location_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    cover_image_url = Column(String, nullable=True)
    has_multiple_locations = Column(Boolean, default=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    view_count = Column(Integer, default=0)
    is_published = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    # Privacy and categorization
    privacy_level = Column(String, default="public")  # 'public', 'followers', 'close_family', 'custom_group', 'private'
    category = Column(String, nullable=True)  # Event category
    custom_group_id = Column(Integer, ForeignKey("custom_groups.id", ondelete="SET NULL"), nullable=True)

    # Shareable links
    share_token = Column(String, unique=True, nullable=True)
    share_enabled = Column(Boolean, default=False)
    share_expires_at = Column(DateTime, nullable=True)
    share_view_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="events")
    content_blocks = relationship("ContentBlock", back_populates="event", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="event", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="event", cascade="all, delete-orphan")
    locations = relationship("EventLocation", back_populates="event", cascade="all, delete-orphan")
    images = relationship("EventImage", back_populates="event", cascade="all, delete-orphan")
    custom_group = relationship("CustomGroup", back_populates="events")