from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class ContentBlock(Base):
    """Content blocks for structured event content.

    Note: This matches the actual database schema in supabase_init.sql.
    The column names are: content_type (not type), order_index (not order).
    """
    __tablename__ = "content_blocks"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    content_type = Column(String(50), nullable=False)  # 'text', 'image', 'video'
    content = Column(Text, nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="content_blocks")