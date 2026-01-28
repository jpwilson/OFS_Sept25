from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class EventLocation(Base):
    __tablename__ = "event_locations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    location_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_type = Column(String, nullable=False)  # 'manual', 'exif', 'inline_marker'
    timestamp = Column(DateTime, nullable=True)  # When this location was visited
    order_index = Column(Integer, default=0)  # For manual ordering
    section_id = Column(String, nullable=True)  # Links to H1/H2 section anchor (e.g., 'section-2')
    section_title = Column(String, nullable=True)  # Human-readable section name
    associated_image_url = Column(String, nullable=True)  # Image thumbnail for map popup
    additional_data = Column(Text, nullable=True)  # JSON string for additional data (altitude, accuracy, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    event = relationship("Event", back_populates="locations")
