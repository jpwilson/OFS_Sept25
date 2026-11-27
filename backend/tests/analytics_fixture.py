"""
Test database and data set for the admin analytics tests (tests only).

make_engine(with_auth=True) is in-memory SQLite with:
- ATTACH DATABASE ':memory:' AS auth, holding minimal auth.users, auth.sessions and
  auth.audit_log_entries tables (with_auth=False leaves auth out, as when the server
  cannot read it);
- Python timezone(), date_trunc() and greatest() with Postgres semantics, so the
  production SQL text runs unchanged.

Times in SQLite are text. Naive values are public.* columns (UTC); values ending in
+00:00 stand for timestamptz. The shims keep that distinction.

build_dataset(db) adds the members, accounts and events that the tests (and the
optional Postgres test) check numbers against. The clock is NOW.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import helpers  # noqa: F401  (registers the UUID shim and every model)
from app.core.database import Base
from app.models.event import Event
from app.models.invited_viewer import InvitedViewer
from app.models.user import User

UTC = timezone.utc
NOW = datetime(2026, 11, 27, 20, 5, 12, tzinfo=UTC)  # 2:05:12 pm in Chicago


# ---------------------------------------------------------------- Postgres shims

def _parse(v):
    return datetime.fromisoformat(str(v))


def _fmt(dt):
    if dt.tzinfo is not None:
        return dt.astimezone(UTC).strftime("%Y-%m-%d %H:%M:%S.%f") + "+00:00"
    return dt.strftime("%Y-%m-%d %H:%M:%S.%f")


def pg_timezone(zone, value):
    """timestamp -> timestamptz (read as wall time in zone); timestamptz -> timestamp in zone."""
    if value is None:
        return None
    dt, z = _parse(value), ZoneInfo(zone)
    if dt.tzinfo is None:
        return _fmt(dt.replace(tzinfo=z))
    return _fmt(dt.astimezone(z).replace(tzinfo=None))


def pg_date_trunc(unit, value):
    if value is None:
        return None
    dt = _parse(value)
    if dt.tzinfo is not None:
        dt = dt.astimezone(UTC)  # the session time zone on Supabase
    dt = dt.replace(minute=0, second=0, microsecond=0)
    if unit in ("day", "month"):
        dt = dt.replace(hour=0)
    if unit == "month":
        dt = dt.replace(day=1)
    return _fmt(dt)


def pg_greatest(*values):
    """Postgres GREATEST ignores NULLs."""
    present = [v for v in values if v is not None]
    return max(present, key=_parse) if present else None


AUTH_TABLES = (
    "CREATE TABLE auth.users (id TEXT PRIMARY KEY, email TEXT, created_at TEXT, deleted_at TEXT,"
    " email_confirmed_at TEXT, last_sign_in_at TEXT, raw_app_meta_data TEXT)",
    "CREATE TABLE auth.sessions (id TEXT PRIMARY KEY, user_id TEXT, created_at TEXT)",
    "CREATE TABLE auth.audit_log_entries (id TEXT PRIMARY KEY, payload TEXT, created_at TEXT)",
)


def make_engine(with_auth=True):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def _setup(dbapi_conn, _record):
        dbapi_conn.create_function("timezone", 2, pg_timezone, deterministic=True)
        dbapi_conn.create_function("date_trunc", 2, pg_date_trunc, deterministic=True)
        dbapi_conn.create_function("greatest", -1, pg_greatest, deterministic=True)
        if with_auth:
            dbapi_conn.execute("ATTACH DATABASE ':memory:' AS auth")
            for ddl in AUTH_TABLES:
                dbapi_conn.execute(ddl)

    Base.metadata.create_all(engine)
    return engine


def make_session(with_auth=True):
    return sessionmaker(bind=make_engine(with_auth))()


# ---------------------------------------------------------------- rows

def ts(dt):
    """A timestamptz value as text that SQLite (shim) and Postgres both read."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return _fmt(dt)


def utc(*args):
    """Naive UTC, as public.* stores it."""
    return datetime(*args)


def add_member(db, username, created_at, **kw):
    kw.setdefault("subscription_tier", "free")
    kw.setdefault("subscription_status", "trial")
    user = User(email=f"{username}@example.com", username=username, created_at=created_at, **kw)
    db.add(user)
    db.flush()
    return user


def add_auth_user(db, email, created_at, provider="email", confirmed=True, deleted=False, last_sign_in_at=None):
    auth_id = str(uuid.uuid4())
    db.execute(text(
        "INSERT INTO auth.users (id, email, created_at, deleted_at, email_confirmed_at, last_sign_in_at,"
        " raw_app_meta_data) VALUES (:id, :email, :created, :deleted, :confirmed, :last, :meta)"
    ), {"id": auth_id, "email": email, "created": ts(created_at),
        "deleted": ts(created_at + timedelta(days=1)) if deleted else None,
        "confirmed": ts(created_at + timedelta(minutes=5)) if confirmed else None,
        "last": ts(last_sign_in_at), "meta": json.dumps({"provider": provider, "providers": [provider]})})
    return auth_id


def link(db, user, auth_id):
    """users.auth_user_id as Postgres prints a uuid (lower case, with hyphens)."""
    db.execute(text("UPDATE users SET auth_user_id = :a WHERE id = :id"), {"a": auth_id, "id": user.id})
    db.expire(user)


def add_audit(db, actor_id, action, created_at, provider="email"):
    payload = {"action": action, "actor_id": actor_id, "actor_username": "hidden@example.com",
               "log_type": "account" if action == "login" else "token", "traits": {"provider": provider}}
    db.execute(text("INSERT INTO auth.audit_log_entries (id, payload, created_at) VALUES (:id, :p, :c)"),
               {"id": str(uuid.uuid4()), "p": json.dumps(payload), "c": ts(created_at)})


def add_session(db, user_id, created_at):
    db.execute(text("INSERT INTO auth.sessions (id, user_id, created_at) VALUES (:id, :u, :c)"),
               {"id": str(uuid.uuid4()), "u": user_id, "c": ts(created_at)})


def add_story(db, author, published=True, deleted=False):
    e = Event(title="A story", author_id=author.id, start_date=datetime(2026, 1, 1),
              is_published=published, is_deleted=deleted, privacy_level="public")
    db.add(e)
    db.flush()
    return e


# ---------------------------------------------------------------- the data set

def build_dataset(db, with_auth=True, audit=True, sessions=False):
    """Members (staff: owner, demo):

    owner  superuser, Google            joined 25 Nov
    demo   demo account, no auth        joined 24 Nov
    tom    legacy (no auth), 3 stories  joined 1 Oct; plan legacy
    ann    email, a draft               joined 21 Nov 11:30 pm Chicago; plan trial_ended
    ruth   Google, invited by tom       joined 27 Nov; 2 stories (1 published) + 1 deleted; plan trial
    paula  email, NOT confirmed         joined 1 Sep; display name "100% Gran"; plan paid
    c_arl  legacy                       joined 1 Aug; plan canceled
    vera   invited viewer, no activity  joined 1 Jun; plan viewer

    Accounts with no profile: pending (email, unconfirmed, 26 Nov), gunf (Google, 23 Nov),
    old (email, 10 Sep); plus a deleted account (25 Nov), which never counts.
    """
    m = {}
    m["owner"] = add_member(db, "owner", utc(2026, 11, 25, 10), is_superuser=True,
                            last_login=utc(2026, 11, 27, 19, 30), display_name="Owner")
    m["demo"] = add_member(db, "demo", utc(2026, 11, 24, 10), is_demo_account=True)
    m["tom"] = add_member(db, "tom", utc(2026, 10, 1, 12), last_login=utc(2026, 11, 1, 12))
    m["ann"] = add_member(db, "ann", utc(2026, 11, 22, 5, 30), display_name="Ann",
                          trial_end_date=utc(2026, 11, 25))
    m["ruth"] = add_member(db, "ruth", utc(2026, 11, 27, 15, 4), display_name="Ruth",
                           last_login=utc(2026, 11, 27, 19), trial_end_date=utc(2026, 12, 27, 15, 4))
    m["paula"] = add_member(db, "paula", utc(2026, 9, 1, 12), display_name="100% Gran",
                            subscription_tier="premium", subscription_status="active")
    m["carl"] = add_member(db, "c_arl", utc(2026, 8, 1, 12),
                           subscription_tier="premium", subscription_status="canceled",
                           trial_end_date=utc(2026, 8, 31))
    m["vera"] = add_member(db, "vera", utc(2026, 6, 1, 12), is_invited_viewer=True, invited_viewer_mode=True,
                           trial_end_date=utc(2026, 7, 1))
    for _ in range(3):
        add_story(db, m["tom"])
    add_story(db, m["ann"], published=False)
    add_story(db, m["ruth"])
    add_story(db, m["ruth"], published=False)
    add_story(db, m["ruth"], deleted=True)
    db.add(InvitedViewer(inviter_id=m["tom"].id, invited_email="ruth@example.com", invite_token="t" * 64,
                         status="signed_up", resulting_user_id=m["ruth"].id))
    db.flush()

    a = {}
    if with_auth:
        a["owner"] = add_auth_user(db, "owner@example.com", utc(2026, 11, 25, 10), "google",
                                   last_sign_in_at=utc(2026, 11, 27, 19, 30))
        a["ann"] = add_auth_user(db, "ann@example.com", utc(2026, 11, 22, 5, 30), "email",
                                 last_sign_in_at=utc(2026, 11, 26, 12))
        a["ruth"] = add_auth_user(db, "ruth@example.com", utc(2026, 11, 27, 15, 4), "google",
                                  last_sign_in_at=utc(2026, 11, 27, 15, 4, 10))
        a["paula"] = add_auth_user(db, "paula@example.com", utc(2026, 9, 1, 12), "email", confirmed=False,
                                   last_sign_in_at=utc(2026, 9, 1, 12))
        for name in ("owner", "ann", "ruth", "paula"):
            link(db, m[name], a[name])
        a["pending"] = add_auth_user(db, "pending@example.com", utc(2026, 11, 26, 10), "email", confirmed=False)
        a["gunf"] = add_auth_user(db, "gunf@example.com", utc(2026, 11, 23, 10), "google")
        a["old"] = add_auth_user(db, "old@example.com", utc(2026, 9, 10, 10), "email")
        a["deleted"] = add_auth_user(db, "deleted@example.com", utc(2026, 11, 25, 10), "email", deleted=True)
        if audit:
            add_audit(db, a["ruth"], "login", utc(2026, 11, 27, 15, 4, 10), "google")
            add_audit(db, a["ruth"], "token_refreshed", utc(2026, 11, 27, 16), "google")
            add_audit(db, a["ann"], "login", utc(2026, 11, 22, 6))  # midnight in Chicago: 22 Nov
            add_audit(db, a["ann"], "login", utc(2026, 11, 26, 12))
            add_audit(db, a["ann"], "token_refreshed", utc(2026, 11, 26, 13))
            add_audit(db, a["paula"], "token_refreshed", utc(2026, 11, 25, 12))
            add_audit(db, a["owner"], "login", utc(2026, 11, 27, 19, 30), "google")
            add_audit(db, a["ann"], "login", utc(2026, 10, 1, 12))  # outside 7d
            add_audit(db, a["ann"], "logout", utc(2026, 11, 26, 14))  # not a sign-in
        if sessions:
            add_session(db, a["ruth"], utc(2026, 11, 27, 15, 4, 10))
            add_session(db, a["ann"], utc(2026, 11, 22, 6))
            add_session(db, a["ann"], utc(2026, 11, 26, 12))
            add_session(db, a["owner"], utc(2026, 11, 27, 19, 30))
    db.commit()
    return m, a
