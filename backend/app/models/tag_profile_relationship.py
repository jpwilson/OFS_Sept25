from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class TagProfileRelationship(Base):
    """
    Represents a relationship between a tag profile and a user.
    Allows tag profiles (non-users) to have multiple relationships with different users.

    Example: Kim Beater (tag profile) can be:
    - Jean-Paul's father-in-law
    - Michelle's father
    - Someone else's brother
    """
    __tablename__ = "tag_profile_relationships"

    id = Column(Integer, primary_key=True, index=True)
    tag_profile_id = Column(Integer, ForeignKey("tag_profiles.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50), nullable=False)  # "father", "father-in-law", "pet", etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    # Ensure each tag profile can only have one relationship type per user
    __table_args__ = (
        UniqueConstraint('tag_profile_id', 'user_id', name='unique_tag_profile_user'),
    )

    # Relationships
    tag_profile = relationship("TagProfile", backref="relationships")
    user = relationship("User", backref="tag_profile_relationships")
