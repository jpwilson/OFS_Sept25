"""
Admin analytics: visitors, sign-ups, sign-ins and members (docs/app/ADMIN-ANALYTICS.md).

Safety rules for this file:
- every route is superuser-only (set on the router) and sends Cache-Control: no-store;
- errors log only the exception class and a stage name, never str(e): SQLAlchemy
  messages carry bound parameters such as a searched email;
- the auth schema is probed inside a savepoint; if it cannot be read the numbers that
  need it are null, never a 500;
- one connection per request (the Supabase pooler allows about 5): queries run one after
  another, and /visitors closes the session before it calls PostHog.
"""
import logging
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from time import monotonic
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..core.deps import get_current_superuser
from ..schemas.admin_analytics import (
    MembersPage, MembersQuery, Overview, Unfinished, Visitors, VisitorsFailed, VisitorsNotConfigured,
)
from ..services import analytics_sql as sql
from ..services import posthog_query
from ..services.analytics_time import fill, normalize, parse_ts, resolve_window, safe_tz, utc_z, bucket_key

log = logging.getLogger("ofs.admin_analytics")

NO_STORE = {"Cache-Control": "no-store"}
RESULT_TTL_S = 60
VISITORS_TTL_S = 300
PROBE_TTL_S = 600
AUDIT_LOG_MAX_DAYS = 90
VERCEL_ANALYTICS_URL = "https://vercel.com/jpwilsons-projects/ofs-sept25-frontend/analytics"

SIGNUP_FIELDS = ("started", "profiles", "email", "google", "other", "invited", "organic")
SIGNIN_FIELDS = ("signins", "members", "google", "email", "active")
FUNNEL_STEPS = ("accounts", "confirmed", "profiles", "with_story", "with_published")


def _no_store(response: Response):
    response.headers["Cache-Control"] = "no-store"


router = APIRouter(
    prefix="/admin/analytics",
    tags=["admin-analytics"],
    dependencies=[Depends(get_current_superuser), Depends(_no_store)],
)


# ---------------------------------------------------------------- caches (per process)

class _TTLCache:
    def __init__(self, ttl: float, max_items: int = 64):
        self.ttl = ttl
        self.max_items = max_items
        self._items = {}

    def get(self, key):
        hit = self._items.get(key)
        if hit and monotonic() - hit[0] < self.ttl:
            return hit[1]
        self._items.pop(key, None)
        return None

    def put(self, key, value):
        if len(self._items) >= self.max_items:
            self._items.pop(next(iter(self._items)))
        self._items[key] = (monotonic(), value)

    def clear(self):
        self._items.clear()


_results = _TTLCache(RESULT_TTL_S)
_visitors = _TTLCache(VISITORS_TTL_S)
_probe = _TTLCache(PROBE_TTL_S, max_items=1)


def reset_caches():
    """Tests, and anyone who needs fresh numbers inside a process."""
    for cache in (_results, _visitors, _probe):
        cache.clear()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _tz() -> str:
    return safe_tz(settings.ANALYTICS_TZ)


# ---------------------------------------------------------------- shared helpers

class _Stage:
    name = "start"


@contextmanager
def _failsafe(db: Session, what: str):
    """Turn any failure into a generic 500 that logs only the class and the stage."""
    stage = _Stage()
    try:
        yield stage
    except HTTPException:
        raise
    except Exception as e:
        log.error("admin analytics %s failed at %s (%s)", what, stage.name, type(e).__name__)
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="The analytics could not be loaded. Try again in a minute.",
            headers=NO_STORE,
        ) from None


def _prepare(db: Session):
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text("SET LOCAL statement_timeout = '8s'"))


def _readable(db: Session, query: str, params: dict, need_row: bool = False) -> bool:
    try:
        with db.begin_nested():
            rows = sql.run(db, query, params)
        return bool(rows) if need_row else True
    except Exception as e:
        log.info("admin analytics: auth probe could not read (%s)", type(e).__name__)
        return False


def auth_sources(db: Session, now: datetime) -> dict:
    """{'auth': bool, 'signins': 'audit_log' | 'sessions' | None}, cached for 10 minutes."""
    hit = _probe.get("sources")
    if hit is not None:
        return dict(hit)
    found = {"auth": False, "signins": None}
    if _readable(db, sql.PROBE_AUTH_USERS, {}):
        found["auth"] = True
        if _readable(db, sql.PROBE_AUDIT_LOGINS, {"since": now - timedelta(days=30)}, need_row=True):
            found["signins"] = "audit_log"
        elif _readable(db, sql.PROBE_SESSIONS, {}):
            found["signins"] = "sessions"
    _probe.put("sources", found)
    return dict(found)


def _first_signup(db: Session) -> Optional[datetime]:
    rows = sql.run(db, sql.first_signup(), {})
    return parse_ts(rows[0]["first"]) if rows else None


def _int(v) -> int:
    return int(v or 0)


# ---------------------------------------------------------------- overview

def _signups(db, w, include_staff, with_auth) -> dict:
    params = {"start": w.start, "end": w.end}
    rows = {}
    if with_auth:
        for r in sql.run(db, sql.signups_started(w.interval, w.tz, include_staff), params):
            rows.setdefault(bucket_key(r["b"]), {})["started"] = r["started"]
    for r in sql.run(db, sql.signups_profiles(w.interval, w.tz, include_staff, with_auth), params):
        point = rows.setdefault(bucket_key(r["b"]), {})
        point.update(profiles=r["profiles"], email=r["email"], google=r["google"], other=r["other"],
                     invited=r["invited"], organic=_int(r["profiles"]) - _int(r["invited"]))
    nulls = () if with_auth else ("started", "email", "google")
    series = fill(w, rows, SIGNUP_FIELDS, nulls)
    totals = {f: None if f in nulls else sum(p[f] for p in series) for f in SIGNUP_FIELDS}
    return {"series": series, "totals": totals}


def _steps(rows) -> dict:
    return {s: sum(_int(r[s]) for r in rows) for s in FUNNEL_STEPS}


def _funnel(db, w, include_staff, with_auth) -> dict:
    rows = sql.run(db, sql.funnel(include_staff, with_auth), {"start": w.start, "end": w.end})
    steps = _steps(rows)
    if not with_auth:
        steps.update(accounts=None, confirmed=None)
        empty = dict.fromkeys(FUNNEL_STEPS)
        return {"steps": steps, "by_method": {"email": dict(empty), "google": dict(empty)}, "unfinished": None}
    by_method = {m: _steps([r for r in rows if r["method"] == m]) for m in ("email", "google")}
    return {"steps": steps, "by_method": by_method, "unfinished": steps["accounts"] - steps["profiles"]}


def _no_signins(w, note) -> dict:
    return {"series": fill(w, {}, SIGNIN_FIELDS, nulls=SIGNIN_FIELDS),
            "totals": dict.fromkeys(("signins", "members", "active")), "note": note}


def _signins(db, w, include_staff, source, now) -> dict:
    if source is None:
        return _no_signins(w, "Sign-ins need the Supabase auth tables, which the server could not read.")
    start, note = w.start, None
    if source == "audit_log":
        cap = now - timedelta(days=AUDIT_LOG_MAX_DAYS)
        if start < cap:
            start = cap
            note = (f"Sign-ins before {cap.strftime('%Y-%m-%d')} are not counted: "
                    f"the audit log is read for {AUDIT_LOG_MAX_DAYS} days at most.")
        query = sql.signins_audit(w.interval, w.tz, include_staff)
    else:
        query = sql.signins_sessions(w.interval, w.tz, include_staff)
        note = "Counted from sign-in sessions: people who later signed out are not counted."
    try:
        with db.begin_nested():  # the audit log has no index on created_at; a timeout must not end the page
            rows = sql.run(db, query, {"start": start, "end": w.end})
    except Exception as e:
        log.warning("admin analytics overview failed at signins (%s)", type(e).__name__)
        return _no_signins(w, "Sign-ins could not be loaded this time.")

    per_bucket, members, active = {}, set(), set()
    for r in rows:
        key, actor, logins = bucket_key(r["b"]), r["actor"], _int(r["logins"])
        b = per_bucket.setdefault(key, {"signins": 0, "google": 0, "email": 0, "_members": set(), "_active": set()})
        b["signins"] += logins
        b["google"] += _int(r["google"])
        b["email"] += _int(r["email"])
        b["_active"].add(actor)
        active.add(actor)
        if logins:
            b["_members"].add(actor)
            members.add(actor)
    for b in per_bucket.values():
        b["members"] = len(b.pop("_members"))
        b["active"] = len(b.pop("_active"))
    sessions = source == "sessions"
    return {
        "series": fill(w, per_bucket, SIGNIN_FIELDS, nulls=("active",) if sessions else ()),
        "totals": {"signins": sum(b["signins"] for b in per_bucket.values()),
                   "members": len(members), "active": None if sessions else len(active)},
        "note": note,
    }


def _activity(db, now, include_staff, with_auth) -> dict:
    params = {"since_24h": now - timedelta(hours=24), "since_7d": now - timedelta(days=7),
              "since_30d": now - timedelta(days=30)}
    r = sql.run(db, sql.activity(include_staff, with_auth), params)[0]
    return {
        "members": _int(r["members"]),
        "active_24h": _int(r["active_24h"]),
        "active_7d": _int(r["active_7d"]),
        "active_30d": _int(r["active_30d"]),
        "signed_in_24h": _int(r["signed_in_24h"]) if with_auth else None,
        "signed_in_7d": _int(r["signed_in_7d"]) if with_auth else None,
        "last_login_rows": _int(r["last_login_rows"]),
        "last_login_latest": utc_z(r["last_login_latest"]),
    }


@router.get("/overview", response_model=Overview)
def overview(
    range_: str = Query("7d", alias="range"),
    interval: Optional[str] = None,
    include_staff: bool = False,
    db: Session = Depends(get_db),
):
    range_, interval = normalize(range_, interval)
    key = ("overview", range_, interval, include_staff)
    hit = _results.get(key)
    if hit is not None:
        return hit
    with _failsafe(db, "overview") as stage:
        now = _now()
        stage.name = "prepare"
        _prepare(db)
        stage.name = "probe"
        sources = auth_sources(db, now)
        with_auth = sources["auth"]
        stage.name = "window"
        first = _first_signup(db) if range_ == "all" else None
        w = resolve_window(range_, interval, now, _tz(), first)
        stage.name = "signups"
        signups = _signups(db, w, include_staff, with_auth)
        stage.name = "funnel"
        funnel = _funnel(db, w, include_staff, with_auth)
        stage.name = "signins"
        signins = _signins(db, w, include_staff, sources["signins"], now)
        stage.name = "activity"
        activity = _activity(db, now, include_staff, with_auth)
        body = {
            "range": w.range, "interval": w.interval, "tz": w.tz,
            "start": w.start_label, "end": w.end_label, "generated_at": utc_z(now),
            "sources": sources, "signups": signups, "funnel": funnel, "signins": signins, "activity": activity,
        }
    _results.put(key, body)
    return body


# ---------------------------------------------------------------- members

def _member(r) -> dict:
    inviter = None
    if r["inviter_id"] is not None:
        inviter = {"id": r["inviter_id"], "username": r["inviter_username"],
                   "display_name": r["inviter_display_name"]}
    return {
        "id": r["id"],
        "username": r["username"],
        "display_name": r["display_name"],
        "email": r["email"],
        "avatar_url": r["avatar_url"],
        "joined_at": utc_z(r["joined_at"]),
        "last_sign_in_at": utc_z(r["last_sign_in_at"]),
        "last_active_at": utc_z(r["last_active_at"]),
        "email_confirmed": None if r["email_confirmed"] is None else bool(r["email_confirmed"]),
        "method": r["method"],
        "invited_by": inviter,
        "plan": {"state": r["plan_state"], "tier": r["plan_tier"], "status": r["plan_status"],
                 "trial_ends_at": utc_z(r["trial_ends_at"])},
        "stories": _int(r["stories"]),
        "published": _int(r["published"]),
        "is_superuser": bool(r["is_superuser"]),
    }


@router.post("/members", response_model=MembersPage)
def members(body: MembersQuery, db: Session = Depends(get_db)):
    """POST so that search text stays out of URLs and request logs."""
    key = ("members", body.model_dump_json())
    hit = _results.get(key)
    if hit is not None:
        return hit
    with _failsafe(db, "members") as stage:
        now = _now()
        stage.name = "prepare"
        _prepare(db)
        stage.name = "probe"
        with_auth = auth_sources(db, now)["auth"]
        stage.name = "query"
        page_sql, count_sql = sql.members(body, with_auth)
        params = {
            "q": sql.escape_like(body.q) if body.q else None,
            "method": body.method,
            "plan": body.plan,
            "now": now,
            "since_7d": now - timedelta(days=7),
            "since_30d": now - timedelta(days=30),
            "joined_since": resolve_window(body.joined, None, now, _tz()).start if body.joined != "all" else None,
            "limit": body.page_size,
            "offset": (body.page - 1) * body.page_size,
        }
        rows = sql.run(db, page_sql, params)
        if rows:
            total = _int(rows[0]["total"])
        elif body.page > 1:  # past the last page: count(*) OVER () has no row to ride on
            stage.name = "count"
            total = _int(sql.run(db, count_sql, params)[0]["total"])
        else:
            total = 0
        result = {"total": total, "page": body.page, "page_size": body.page_size,
                  "sources": {"auth": with_auth}, "members": [_member(r) for r in rows]}
    _results.put(key, result)
    return result


# ---------------------------------------------------------------- unfinished

@router.get("/unfinished", response_model=Unfinished)
def unfinished(range_: str = Query("7d", alias="range"), db: Session = Depends(get_db)):
    """Supabase accounts with no profile (at most 50, newest first)."""
    range_, _ = normalize(range_, None)
    key = ("unfinished", range_)
    hit = _results.get(key)
    if hit is not None:
        return hit
    with _failsafe(db, "unfinished") as stage:
        now = _now()
        stage.name = "prepare"
        _prepare(db)
        stage.name = "probe"
        if not auth_sources(db, now)["auth"]:
            result = {"available": False, "accounts": []}
        else:
            stage.name = "query"
            start = (datetime(2000, 1, 1, tzinfo=timezone.utc) if range_ == "all"
                     else resolve_window(range_, None, now, _tz()).start)
            rows = sql.run(db, sql.unfinished(), {"start": start, "end": now})
            result = {"available": True, "accounts": [
                {"created_at": utc_z(r["created_at"]), "confirmed": bool(r["confirmed"]),
                 "method": r["method"], "email": r["email"]} for r in rows]}
    _results.put(key, result)
    return result


# ---------------------------------------------------------------- visitors

def _posthog_missing() -> list:
    return [name for name in ("POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID")
            if not str(getattr(settings, name, "") or "").strip()]


@router.get("/visitors")
def visitors(
    range_: str = Query("7d", alias="range"),
    interval: Optional[str] = None,
    include_staff: bool = False,
    db: Session = Depends(get_db),
):
    """Always HTTP 200: not configured, PostHog failed, or the numbers."""
    range_, interval = normalize(range_, interval)
    missing = _posthog_missing()
    if missing:
        return VisitorsNotConfigured(missing=missing, links={
            "posthog": settings.POSTHOG_API_HOST, "vercel_analytics": VERCEL_ANALYTICS_URL}).model_dump()
    project_id = settings.POSTHOG_PROJECT_ID.strip()
    if not project_id.isdigit():
        return VisitorsFailed(error="POSTHOG_PROJECT_ID must be the numeric project ID").model_dump()

    key = (range_, interval, include_staff)
    hit = _visitors.get(key)
    if hit is not None:
        return hit
    with _failsafe(db, "visitors") as stage:
        now = _now()
        stage.name = "prepare"
        _prepare(db)
        stage.name = "window"
        first = _first_signup(db) if range_ == "all" else None
        stage.name = "staff"
        staff = [] if include_staff else [r["id"] for r in sql.run(db, sql.staff_ids(), {})]
        db.close()  # give the pooler connection back before the slow HTTP call
        w = resolve_window(range_, interval, now, _tz(), first)
    try:
        report = posthog_query.visitor_report(
            w, staff, host=settings.POSTHOG_API_HOST, project_id=project_id,
            key=settings.POSTHOG_PERSONAL_API_KEY.strip())
    except posthog_query.PostHogError as e:
        log.warning("admin analytics visitors: %s", e.reason)
        return VisitorsFailed(error=e.reason).model_dump()
    result = Visitors(interval=w.interval, cached_at=utc_z(now), **report).model_dump()
    _visitors.put(key, result)
    return result
