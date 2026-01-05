from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class UserRelationship(Base):
    """
    A verified relationship between two users who mutually follow each other.
    For example: wife/husband, parent/child, siblings, etc.

    The relationship is bidirectional - each user has their own label for the other.
    user_a_id is always < user_b_id to ensure unique constraint works properly.
    """
    __tablename__ = "user_relationships"

    id = Column(Integer, primary_key=True, index=True)

    # The two users in the relationship (ordered: user_a_id < user_b_id)
    user_a_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_b_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # What each user calls the other
    # e.g., user_a calls user_b "wife", user_b calls user_a "husband"
    relationship_a_to_b = Column(String(50), nullable=False)
    relationship_b_to_a = Column(String(50), nullable=False)

    # Status: pending (awaiting approval), accepted, rejected
    status = Column(String(20), default='pending', nullable=False)

    # Who proposed the relationship
    proposed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)

    # Relationships
    user_a = relationship("User", foreign_keys=[user_a_id], backref="relationships_as_a")
    user_b = relationship("User", foreign_keys=[user_b_id], backref="relationships_as_b")
    proposed_by = relationship("User", foreign_keys=[proposed_by_id])

    # Table constraints
    __table_args__ = (
        CheckConstraint('user_a_id < user_b_id', name='user_relationships_ordering'),
        CheckConstraint("status IN ('pending', 'accepted', 'rejected')", name='user_relationships_status_check'),
    )

    def get_relationship_for_user(self, user_id: int) -> str:
        """Get how the other person describes this user."""
        if user_id == self.user_a_id:
            return self.relationship_b_to_a  # How B describes A
        elif user_id == self.user_b_id:
            return self.relationship_a_to_b  # How A describes B
        return None

    def get_other_user_id(self, user_id: int) -> int:
        """Get the ID of the other user in the relationship."""
        if user_id == self.user_a_id:
            return self.user_b_id
        elif user_id == self.user_b_id:
            return self.user_a_id
        return None

    def get_label_for_other(self, user_id: int) -> str:
        """Get how this user describes the other person."""
        if user_id == self.user_a_id:
            return self.relationship_a_to_b  # How A describes B
        elif user_id == self.user_b_id:
            return self.relationship_b_to_a  # How B describes A
        return None
