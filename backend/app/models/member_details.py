from datetime import datetime

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, String, text

from ..core.database import Base


class MemberDetails(Base):
    """A member's own birthday and birthplace: one row per member, created on first save.

    Kept off `users` on purpose (docs/app/FAMILY-NOTES.md). birth_date_visibility covers
    both the birth date and the birthplace; there is no public option."""
    __tablename__ = "member_details"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, autoincrement=False)
    birth_date = Column(Date, nullable=True)
    birthplace = Column(String(120), nullable=True)
    birth_date_visibility = Column(String(10), nullable=False, default="relatives",
                                   server_default=text("'relatives'"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("birth_date_visibility IN ('relatives','only_me')", name="member_details_visibility_check"),
    )
