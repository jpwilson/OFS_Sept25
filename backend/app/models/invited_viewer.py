from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import secrets
from ..core.database import Base


class InvitedViewer(Base):
    """
    Tracks invitations sent to non-users.
    When invitee signs up, resulting_user_id links to their account.
    """
    __tablename__ = "invited_viewers"

    id = Column(Integer, primary_key=True, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invited_email = Column(String, nullable=True, index=True)  # Nullable for link-based invites
    invited_name = Column(String, nullable=True)  # Display name provided by inviter

    # Secure token for signup link
    invite_token = Column(String(64), unique=True, nullable=False, index=True)

    # Status: 'pending' (not signed up), 'signed_up' (created account)
    status = Column(String, default='pending')

    # Links to the user account when they sign up
    resulting_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    signed_up_at = Column(DateTime, nullable=True)

    # Relationships
    inviter = relationship("User", foreign_keys=[inviter_id], back_populates="sent_invitations")
    resulting_user = relationship("User", foreign_keys=[resulting_user_id])

    @staticmethod
    def generate_token():
        """Generate a secure random token for the invitation link"""
        return secrets.token_urlsafe(48)  # 64 characters
