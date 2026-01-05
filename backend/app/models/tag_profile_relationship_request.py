from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class TagProfileRelationshipRequest(Base):
    """
    Request to add a relationship between a tag profile and a user.
    Non-creators can propose relationships, creator approves/rejects.

    Example: Michelle wants to add that Kim Beater is her father.
    Jean-Paul (creator of Kim's profile) gets the request and can approve it.
    """
    __tablename__ = "tag_profile_relationship_requests"

    id = Column(Integer, primary_key=True, index=True)
    tag_profile_id = Column(Integer, ForeignKey("tag_profiles.id", ondelete="CASCADE"), nullable=False)
    proposer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # "father", "uncle", etc.
    message = Column(Text, nullable=True)  # Optional message explaining the request
    status = Column(String(20), default="pending")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    tag_profile = relationship("TagProfile", backref="relationship_requests")
    proposer = relationship("User", backref="tag_profile_relationship_requests")
