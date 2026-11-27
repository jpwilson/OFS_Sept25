"""
Shared set-up for the privacy tests: an in-memory SQLite database built from the
SQLAlchemy models, so no Postgres or network is needed.

    cd backend && .venv/bin/python -m unittest discover -s tests -v
"""
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


# Shim: let SQLite create the Postgres-only UUID column on users.
@compiles(UUID, "sqlite")
def _uuid_on_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


from app.core.database import Base  # noqa: E402
import app.models  # noqa: E402,F401  (registers every table for create_all)
from app.models.user import User  # noqa: E402
from app.models.event import Event  # noqa: E402
from app.models.follow import Follow  # noqa: E402


def make_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


def make_session():
    return sessionmaker(bind=make_engine())()


def add_user(db, username, **kw):
    """A member with an active paid plan (so their stories are visible)."""
    kw.setdefault("subscription_tier", "premium")
    kw.setdefault("subscription_status", "active")
    user = User(email=f"{username}@example.com", username=username, **kw)
    db.add(user)
    db.flush()
    return user


def add_follow(db, follower, following, status="accepted", **kw):
    follow = Follow(follower_id=follower.id, following_id=following.id, status=status, **kw)
    db.add(follow)
    db.flush()
    return follow


def add_event(db, author, title, privacy_level="public", **kw):
    kw.setdefault("is_published", True)
    kw.setdefault("is_deleted", False)
    event = Event(
        title=title,
        author_id=author.id,
        start_date=kw.pop("start_date", datetime(2026, 1, 1)),
        privacy_level=privacy_level,
        **kw,
    )
    db.add(event)
    db.flush()
    return event
