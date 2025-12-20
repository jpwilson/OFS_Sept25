from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class TagProfileClaim(Base):
    """
    A claim request from a user wanting to claim a tag profile as their identity.
    When approved, the tag profile is merged with the user account.
    """
    __tablename__ = "tag_profile_claims"

    id = Column(Integer, primary_key=True, index=True)

    # The tag profile being claimed
    tag_profile_id = Column(Integer, ForeignKey("tag_profiles.id", ondelete="CASCADE"), nullable=False)

    # The user claiming the profile
    claimant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Optional message from claimant to explain why they're claiming
    message = Column(Text, nullable=True)

    # Status: 'pending', 'approved', 'rejected'
    status = Column(String(50), default="pending", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    tag_profile = relationship("TagProfile", backref="claims")
    claimant = relationship("User", backref="tag_profile_claims")
