"""
Who counts as family for notes, history and birthdays, and the text and date rules
those features share. The rules are written down in docs/app/FAMILY-NOTES.md.

Family of member P, for viewer v: v is P, or there is one accepted user_relationships
row for the pair (any relationship word counts, "friend" included).

Family of tag T: T's creator, users with an approved link to T (tag_profile_relationships;
pending requests don't count), and the creator's accepted relatives. A merged tag is its
member.

Privacy: nothing here logs. Never log note bodies, birthdays or birthplaces.
"""
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, exists, literal, or_
from sqlalchemy.orm import Session

from ..models.tag_profile import TagProfile
from ..models.tag_profile_relationship import TagProfileRelationship
from ..models.user import User
from ..models.user_relationship import UserRelationship

MAX_NOTE_LENGTH = 4000
MAX_PLACE_LENGTH = 120
PRECISIONS = ("day", "month", "year")  # finest first
EARLIEST_HISTORY = date(1000, 1, 1)
EARLIEST_BIRTHDAY = date(1900, 1, 1)


# --- Who is family ---------------------------------------------------------------

@dataclass(frozen=True)
class Subject:
    """The person a note is about, as seen by one viewer."""
    user_id: Optional[int]
    tag_profile_id: Optional[int]
    name: str
    owner_id: int  # the member themself, or the tag's creator: may delete any note about them
    is_family: bool

    def forbidden(self) -> HTTPException:
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only {self.name}'s family can see notes about {self.name}.")


def ordered_pair(a: int, b: int) -> Tuple[int, int]:
    """user_relationships stores each pair once, with user_a_id < user_b_id."""
    return (a, b) if a < b else (b, a)


def accepted_relationship_exists(a: int, b: int):
    """EXISTS: an accepted relationship between users a and b (a != b)."""
    lo, hi = ordered_pair(a, b)
    return exists().where(
        UserRelationship.user_a_id == lo,
        UserRelationship.user_b_id == hi,
        UserRelationship.status == "accepted",
    )


def is_family_of_member(db: Session, viewer_id: int, member_id: int) -> bool:
    if viewer_id == member_id:
        return True
    return bool(db.query(accepted_relationship_exists(viewer_id, member_id)).scalar())


def member_name(display_name, full_name, username) -> str:
    return display_name or full_name or username


def resolve_member(db: Session, viewer_id: int, member_id: int) -> Subject:
    """The member and the verdict in one statement; 404 when there is no such member."""
    verdict = literal(True) if viewer_id == member_id else accepted_relationship_exists(viewer_id, member_id)
    row = db.query(User.id, User.username, User.display_name, User.full_name, verdict.label("is_family")) \
        .filter(User.id == member_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return Subject(user_id=row.id, tag_profile_id=None,
                   name=member_name(row.display_name, row.full_name, row.username),
                   owner_id=row.id, is_family=bool(row.is_family))


def tag_family_clause(viewer_id: int):
    """SQL: the viewer is family of the TagProfile row in the enclosing query."""
    creator = TagProfile.created_by_id
    return or_(
        creator == viewer_id,
        exists().where(
            TagProfileRelationship.tag_profile_id == TagProfile.id,
            TagProfileRelationship.user_id == viewer_id,
        ),
        exists().where(
            UserRelationship.status == "accepted",
            or_(
                and_(UserRelationship.user_a_id == viewer_id, UserRelationship.user_b_id == creator),
                and_(UserRelationship.user_b_id == viewer_id, UserRelationship.user_a_id == creator),
            ),
        ),
    )


def resolve_tag(db: Session, viewer_id: int, tag_profile_id: int) -> Subject:
    """The tag and the verdict in one statement. A merged tag is its member; 404 when missing."""
    row = db.query(TagProfile.id, TagProfile.name, TagProfile.created_by_id, TagProfile.is_merged,
                   TagProfile.merged_user_id, tag_family_clause(viewer_id).label("is_family")) \
        .filter(TagProfile.id == tag_profile_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag profile not found")
    if row.is_merged and row.merged_user_id:
        return resolve_member(db, viewer_id, row.merged_user_id)
    return Subject(user_id=None, tag_profile_id=row.id, name=row.name,
                   owner_id=row.created_by_id, is_family=bool(row.is_family))


def resolve_subject(db: Session, viewer_id: int, user_id: Optional[int] = None,
                    tag_profile_id: Optional[int] = None) -> Subject:
    """Exactly one of user_id and tag_profile_id; 422 otherwise."""
    if (user_id is None) == (tag_profile_id is None):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Give either user_id or tag_profile_id.")
    if user_id is not None:
        return resolve_member(db, viewer_id, user_id)
    return resolve_tag(db, viewer_id, tag_profile_id)


def birthday_fields(details) -> dict:
    """A member's birth keys from their member_details row (or None): 'relatives' when
    they have never saved any. For the member themself only (GET /users/me)."""
    if details is None:
        return {"birth_date": None, "birthplace": None, "birth_date_visibility": "relatives"}
    return {"birth_date": details.birth_date, "birthplace": details.birthplace,
            "birth_date_visibility": details.birth_date_visibility}


# --- Text ------------------------------------------------------------------------

# Control characters except \t and \n, and the bidi embedding, override and isolate
# characters. Zero-width joiners (U+200D), which emoji use, are kept.
_UNSAFE_CHARS = re.compile("[\x00-\x08\x0b-\x1f\x7f-\x9f‪-‮⁦-⁩]")
_BLANK_LINES = re.compile(r"\n{3,}")


def clean_text(raw: str) -> str:
    """CRLF to LF, drop unsafe characters, trim, at most one blank line in a row.
    The result is stored as written: never HTML-escaped, never rendered as HTML."""
    text = _UNSAFE_CHARS.sub("", raw.replace("\r\n", "\n")).strip()
    return _BLANK_LINES.sub("\n\n", text)


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


def clean_note_body(raw: str) -> str:
    body = clean_text(raw)
    if not body:
        raise _unprocessable("Write something first.")
    if len(body) > MAX_NOTE_LENGTH:
        raise _unprocessable(f"Keep it to {MAX_NOTE_LENGTH} characters.")
    return body


def clean_place(raw: Optional[str]) -> Optional[str]:
    """A birthplace: one line of at most 120 characters; empty means none."""
    if raw is None:
        return None
    place = clean_text(raw)
    if "\n" in place:
        raise _unprocessable("A birthplace is one line.")
    if len(place) > MAX_PLACE_LENGTH:
        raise _unprocessable(f"Keep the birthplace to {MAX_PLACE_LENGTH} characters.")
    return place or None


# --- Dates -----------------------------------------------------------------------

def utc_today() -> date:
    return datetime.utcnow().date()


def normalise_date(value: date, precision: Optional[str]) -> date:
    """Stored form: month precision as YYYY-MM-01, year precision as YYYY-01-01."""
    if precision == "month":
        return value.replace(day=1)
    if precision == "year":
        return value.replace(month=1, day=1)
    return value


def note_date(kind: str, happened_on: Optional[date],
              precision: Optional[str]) -> Tuple[Optional[date], Optional[str]]:
    """The stored (date, precision) for a note or history entry, or a 422."""
    if happened_on is None:
        if precision is not None:
            raise _unprocessable("A date precision needs a date.")
        return None, None
    if kind != "history":
        raise _unprocessable("Only history entries have a date")
    precision = precision or "day"
    happened_on = normalise_date(happened_on, precision)
    if not EARLIEST_HISTORY <= happened_on <= utc_today() + timedelta(days=1):
        raise _unprocessable("Choose a date between the year 1000 and today.")
    return happened_on, precision


def check_birthday(value: Optional[date]) -> Optional[date]:
    """A member's own birthday: between 1900-01-01 and today."""
    if value is not None and not EARLIEST_BIRTHDAY <= value <= utc_today():
        raise _unprocessable("Choose a birthday between 1900 and today.")
    return value


def tag_dates(birth_date: Optional[date], birth_precision: Optional[str],
              died_on: Optional[date], died_precision: Optional[str]):
    """The stored (birth_date, birth_date_precision, died_on, died_on_precision) for a tag,
    or a 422. A birth date without a precision means an exact day (stored as NULL)."""
    if birth_date is None and birth_precision is not None:
        raise _unprocessable("A birth date precision needs a birth date.")
    if died_on is None and died_precision is not None:
        raise _unprocessable("A date of death precision needs a date.")
    if birth_date is not None:
        birth_date = normalise_date(birth_date, birth_precision)
    if died_on is not None:
        died_precision = died_precision or "day"
        died_on = normalise_date(died_on, died_precision)
    if birth_date is not None and died_on is not None:
        # Compare at the coarser of the two precisions: born 10 June 1952, died 1952 is fine.
        grain = PRECISIONS[max(PRECISIONS.index(birth_precision or "day"), PRECISIONS.index(died_precision))]
        if normalise_date(died_on, grain) < normalise_date(birth_date, grain):
            raise _unprocessable("The date of death is before the birth date.")
    return birth_date, birth_precision, died_on, died_precision
