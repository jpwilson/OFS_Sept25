"""
Notes and history about people on the family tree, and a member's own birthday.
The rules are in docs/app/FAMILY-NOTES.md; who counts as family is in utils/family.py.

Privacy: never log note bodies, birthdays, birthplaces or emails. Errors log only the
exception class.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.deps import get_current_user, require_not_demo
from ..models.family_note import FamilyNote
from ..models.member_details import MemberDetails
from ..models.user import User
from ..schemas.family_note import (
    FamilyDetailsResponse,
    FamilyDetailsUpdate,
    FamilyNoteAuthor,
    FamilyNoteCreate,
    FamilyNotePage,
    FamilyNoteResponse,
    FamilyNotesResponse,
    FamilyNoteUpdate,
    NoteKind,
)
from ..utils.family import (
    Subject,
    birthday_fields,
    check_birthday,
    clean_note_body,
    clean_place,
    member_name,
    note_date,
    resolve_subject,
)
from ..utils.rate_limit import SlidingWindowLimiter

router = APIRouter(prefix="/family-notes", tags=["family-notes"])
details_router = APIRouter(prefix="/users", tags=["family-details"])

NOTES_PER_WINDOW = 30
NOTES_WINDOW_SECONDS = 10 * 60
_create_limiter = SlidingWindowLimiter(limit=NOTES_PER_WINDOW, window_seconds=NOTES_WINDOW_SECONDS)


# --- Helpers ---------------------------------------------------------------------

def _is_demo(user: User) -> bool:
    return bool(getattr(user, "is_demo_account", False))


def _commit(db: Session) -> None:
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Family notes: save failed ({type(e).__name__})")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="That did not save. Try again.")


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")


def _note_response(note: FamilyNote, viewer: User, subject: Subject) -> FamilyNoteResponse:
    author = note.author
    writable = not _is_demo(viewer)
    return FamilyNoteResponse(
        id=note.id,
        subject_user_id=note.subject_user_id,
        subject_tag_profile_id=note.subject_tag_profile_id,
        kind=note.kind,
        body=note.body,
        happened_on=note.happened_on,
        happened_precision=note.happened_precision,
        author=FamilyNoteAuthor(
            id=author.id,
            username=author.username,
            display_name=member_name(author.display_name, author.full_name, None),
            avatar_url=author.avatar_url,
        ),
        created_at=note.created_at,
        edited_at=note.edited_at,
        can_edit=writable and note.author_id == viewer.id and subject.is_family,
        can_delete=writable and viewer.id in (note.author_id, subject.owner_id),
    )


def _about(subject: Subject):
    if subject.user_id is not None:
        return FamilyNote.subject_user_id == subject.user_id
    return FamilyNote.subject_tag_profile_id == subject.tag_profile_id


def _page(db: Session, viewer: User, subject: Subject, kind: str, skip: int, limit: int) -> FamilyNotePage:
    query = db.query(FamilyNote).options(joinedload(FamilyNote.author)) \
        .filter(_about(subject), FamilyNote.kind == kind)
    if kind == "history":  # dated entries in time order, undated ones last
        query = query.order_by(FamilyNote.happened_on.is_(None), FamilyNote.happened_on.asc(),
                               FamilyNote.created_at.asc(), FamilyNote.id.asc())
    else:  # newest first
        query = query.order_by(FamilyNote.created_at.desc(), FamilyNote.id.desc())
    rows = query.offset(skip).limit(limit + 1).all()
    return FamilyNotePage(items=[_note_response(n, viewer, subject) for n in rows[:limit]],
                          has_more=len(rows) > limit)


def _load(db: Session, viewer: User, note_id: int):
    """The note and its subject as the viewer sees it; 404 when there is no such note."""
    note = db.query(FamilyNote).options(joinedload(FamilyNote.author)).filter(FamilyNote.id == note_id).first()
    if note is None:
        raise _not_found()
    subject = resolve_subject(db, viewer.id, note.subject_user_id, note.subject_tag_profile_id)
    return note, subject


# --- Notes -----------------------------------------------------------------------

@router.get("", response_model=FamilyNotesResponse)
def list_family_notes(
    user_id: Optional[int] = None,
    tag_profile_id: Optional[int] = None,
    kind: Optional[NoteKind] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Notes and history about one member or tag, for their family. With `kind`, only
    that page is filled and the other is null."""
    subject = resolve_subject(db, current_user.id, user_id, tag_profile_id)
    if not subject.is_family:
        raise subject.forbidden()
    pages = {k: _page(db, current_user, subject, k, skip, limit) if kind in (None, k) else None
             for k in ("history", "note")}
    return FamilyNotesResponse(
        subject_user_id=subject.user_id,
        subject_tag_profile_id=subject.tag_profile_id,
        can_write=not _is_demo(current_user),
        history=pages["history"],
        notes=pages["note"],
    )


@router.post("", response_model=FamilyNoteResponse, status_code=status.HTTP_201_CREATED)
def create_family_note(
    data: FamilyNoteCreate,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db),
):
    subject = resolve_subject(db, current_user.id, data.user_id, data.tag_profile_id)
    if not subject.is_family:
        raise subject.forbidden()
    body = clean_note_body(data.body)
    happened_on, precision = note_date(data.kind, data.happened_on, data.happened_precision)
    if not _create_limiter.allow(current_user.id):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="That is a lot of notes at once. Try again in a few minutes.")

    note = FamilyNote(
        subject_user_id=subject.user_id,
        subject_tag_profile_id=subject.tag_profile_id,
        author_id=current_user.id,
        kind=data.kind,
        body=body,
        happened_on=happened_on,
        happened_precision=precision,
        created_at=datetime.utcnow(),
    )
    db.add(note)
    _commit(db)
    db.refresh(note)
    return _note_response(note, current_user, subject)


@router.patch("/{note_id}", response_model=FamilyNoteResponse)
def update_family_note(
    note_id: int,
    data: FamilyNoteUpdate,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db),
):
    """The author only, while still family. Applies only the fields sent; a null date, or a
    null precision sent alone, clears both. The rules are checked on the merged result."""
    note, subject = _load(db, current_user, note_id)
    if note.author_id != current_user.id:
        if not subject.is_family:
            raise _not_found()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can edit this note.")
    if not subject.is_family:
        raise subject.forbidden()

    sent = data.model_dump(exclude_unset=True)
    if "kind" in sent and sent["kind"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose note or history.")
    if "body" in sent and sent["body"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Write something first.")

    kind = sent.get("kind", note.kind)
    body = clean_note_body(sent["body"]) if "body" in sent else note.body
    if "happened_on" in sent:  # a new date keeps the old precision unless one is sent
        happened_on = sent["happened_on"]
        precision = sent.get("happened_precision", note.happened_precision) if happened_on else None
    elif "happened_precision" in sent:  # a new precision for the old date; null clears both
        precision = sent["happened_precision"]
        happened_on = note.happened_on if precision else None
    else:
        happened_on, precision = note.happened_on, note.happened_precision
    happened_on, precision = note_date(kind, happened_on, precision)

    note.kind = kind
    note.body = body
    note.happened_on = happened_on
    note.happened_precision = precision
    note.edited_at = datetime.utcnow()
    _commit(db)
    db.refresh(note)
    return _note_response(note, current_user, subject)


@router.delete("/{note_id}")
def delete_family_note(
    note_id: int,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db),
):
    """The author (even after losing access), the member the note is about, or the tag's
    creator. A note you cannot see answers 404."""
    note, subject = _load(db, current_user, note_id)
    if current_user.id not in (note.author_id, subject.owner_id):
        if not subject.is_family:
            raise _not_found()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Only the author or {subject.name} can delete this note.")
    db.delete(note)
    _commit(db)
    return {"message": "Note deleted"}


# --- A member's own birthday -----------------------------------------------------

@details_router.put("/me/family-details", response_model=FamilyDetailsResponse)
def update_family_details(
    data: FamilyDetailsUpdate,
    current_user: User = Depends(require_not_demo),
    db: Session = Depends(get_db),
):
    """Applies only the fields sent; null clears. A separate route from PUT /users/me/profile,
    which prints its inputs: never log these values."""
    sent = data.model_dump(exclude_unset=True)
    if "birth_date_visibility" in sent and sent["birth_date_visibility"] is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Choose who sees your birthday.")
    birth_date = check_birthday(sent.get("birth_date"))
    birthplace = clean_place(sent.get("birthplace"))

    details = db.get(MemberDetails, current_user.id)
    if details is None:
        details = MemberDetails(user_id=current_user.id, birth_date_visibility="relatives")
        db.add(details)
    if "birth_date" in sent:
        details.birth_date = birth_date
    if "birthplace" in sent:
        details.birthplace = birthplace
    if "birth_date_visibility" in sent:
        details.birth_date_visibility = sent["birth_date_visibility"]
    details.updated_at = datetime.utcnow()
    _commit(db)
    return FamilyDetailsResponse(**birthday_fields(details))
