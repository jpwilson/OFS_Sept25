from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base

class ContentBlockType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"

class ContentBlock(Base):
    __tablename__ = "content_blocks"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    type = Column(Enum(ContentBlockType), nullable=False)
    content = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    caption = Column(String, nullable=True)
    order = Column(Integer, nullable=False)

    event = relationship("Event", back_populates="content_blocks")