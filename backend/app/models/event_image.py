from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class EventImage(Base):
    __tablename__ = "event_images"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    image_url = Column(Text, nullable=False)
    caption = Column(Text, nullable=True)
    # GPS data extracted from EXIF
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime, nullable=True)  # When photo was taken (from EXIF)
    # Ordering and metadata
    order_index = Column(Integer, default=0)
    alt_text = Column(String, nullable=True)  # For accessibility
    width = Column(Integer, nullable=True)  # Image dimensions
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)  # In bytes
    # Video support
    media_type = Column(String(10), default='image', nullable=False)  # 'image' or 'video'
    duration_seconds = Column(Integer, nullable=True)  # Video duration
    video_thumbnail_url = Column(Text, nullable=True)  # Thumbnail for video preview
    # Video processing
    processing_status = Column(String(20), default='ready', nullable=False)  # 'uploading', 'processing', 'ready'
    original_size = Column(Integer, nullable=True)  # Original file size in bytes
    compressed_size = Column(Integer, nullable=True)  # Compressed file size in bytes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    event = relationship("Event", back_populates="images")
