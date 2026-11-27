from datetime import datetime

from sqlalchemy import CheckConstraint, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from ..core.database import Base

PRECISIONS = "('day','month','year')"


class FamilyNote(Base):
    """A note or a history entry about one person on the family tree: a member
    (subject_user_id) or a tagged person (subject_tag_profile_id), never both.

    Deletes are real (no is_deleted). See docs/app/FAMILY-NOTES.md."""
    __tablename__ = "family_notes"

    id = Column(Integer, primary_key=True)
    subject_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    subject_tag_profile_id = Column(Integer, ForeignKey("tag_profiles.id", ondelete="CASCADE"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(10), nullable=False)  # 'note' or 'history'
    body = Column(Text, nullable=False)
    happened_on = Column(Date, nullable=True)  # history only; normalised to the 1st for month/year
    happened_precision = Column(String(5), nullable=True)  # 'day', 'month', 'year'
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    edited_at = Column(DateTime, nullable=True)

    author = relationship("User", foreign_keys=[author_id])

    __table_args__ = (
        CheckConstraint("(subject_user_id IS NULL) <> (subject_tag_profile_id IS NULL)",
                        name="family_notes_one_subject"),
        CheckConstraint("kind IN ('note','history')", name="family_notes_kind_check"),
        CheckConstraint("length(body) BETWEEN 1 AND 4000", name="family_notes_body_length"),
        CheckConstraint(f"happened_precision IS NULL OR happened_precision IN {PRECISIONS}",
                        name="family_notes_precision_check"),
        CheckConstraint("(happened_on IS NULL) = (happened_precision IS NULL)", name="family_notes_date_pair"),
        CheckConstraint("kind = 'history' OR happened_on IS NULL", name="family_notes_note_undated"),
        Index("ix_family_notes_subject_user", "subject_user_id", "kind"),
        Index("ix_family_notes_subject_tag", "subject_tag_profile_id", "kind"),
        Index("ix_family_notes_author_id", "author_id"),
    )
