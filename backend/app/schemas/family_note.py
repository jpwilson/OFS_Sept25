"""Notes, history and birthdays on the family tree (docs/app/FAMILY-NOTES.md).

Field order is part of the contract with the page: frontend/src/daylight/family/sample.test.js
reads the response classes below line by line, so keep one plain `field: type` line per field."""
from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel

NoteKind = Literal["note", "history"]
DatePrecision = Literal["day", "month", "year"]
BirthdayVisibility = Literal["relatives", "only_me"]


class FamilyNoteAuthor(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class FamilyNoteResponse(BaseModel):
    id: int
    subject_user_id: Optional[int] = None
    subject_tag_profile_id: Optional[int] = None
    kind: NoteKind
    body: str
    happened_on: Optional[date] = None
    happened_precision: Optional[DatePrecision] = None
    author: FamilyNoteAuthor
    created_at: datetime
    edited_at: Optional[datetime] = None
    can_edit: bool
    can_delete: bool


class FamilyNotePage(BaseModel):
    items: List[FamilyNoteResponse]
    has_more: bool


class FamilyNotesResponse(BaseModel):
    subject_user_id: Optional[int] = None
    subject_tag_profile_id: Optional[int] = None
    can_write: bool
    history: Optional[FamilyNotePage] = None
    notes: Optional[FamilyNotePage] = None


class FamilyNoteCreate(BaseModel):
    user_id: Optional[int] = None
    tag_profile_id: Optional[int] = None
    kind: NoteKind = "note"
    body: str
    happened_on: Optional[date] = None
    happened_precision: Optional[DatePrecision] = None


class FamilyNoteUpdate(BaseModel):
    kind: Optional[NoteKind] = None
    body: Optional[str] = None
    happened_on: Optional[date] = None
    happened_precision: Optional[DatePrecision] = None


class FamilyDetailsUpdate(BaseModel):
    birth_date: Optional[date] = None
    birthplace: Optional[str] = None
    birth_date_visibility: Optional[BirthdayVisibility] = None


class FamilyDetailsResponse(BaseModel):
    birth_date: Optional[date] = None
    birthplace: Optional[str] = None
    birth_date_visibility: BirthdayVisibility
