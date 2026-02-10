from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime

from ..core.database import Base


class AIUsageLog(Base):
    __tablename__ = "ai_usage_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(50), nullable=False)  # 'transcribe' or 'generate_story'
    created_at = Column(DateTime, default=datetime.utcnow)
