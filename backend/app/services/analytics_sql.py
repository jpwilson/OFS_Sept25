"""
SQL for the admin analytics page (docs/app/ADMIN-ANALYTICS.md).

One SQL text runs on Postgres and on the SQLite test database:
- times use the function forms timezone(zone, x) and date_trunc(unit, x), never
  AT TIME ZONE; the tests register both (and greatest) in Python;
- public.* columns are naive UTC and are wrapped as timezone('UTC', col) before any
  comparison; auth.* columns are timestamptz already;
- JSON is read with -> and ->> (Postgres json/jsonb, SQLite 3.38+).

Only the interval unit and the time zone are placed in the text, and both come from
whitelists. Every value is a bound parameter.
"""
import re
from datetime import datetime

from sqlalchemy import DateTime, bindparam, text

from .analytics_time import RANGES, safe_tz

UNITS = frozenset(u for allowed in RANGES.values() for u in allowed)

PROVIDER = "(au.raw_app_meta_data->>'provider')"
ACTION = "(e.payload->>'action')"
ACTOR = "(e.payload->>'actor_id')"
TRAIT_PROVIDER = "(e.payload->'traits'->>'provider')"


def aware(col: str) -> str:
    """A naive public.* UTC column as timestamptz."""
    return f"timezone('UTC', {col})"


def bucket(interval: str, tz: str, aware_expr: str) -> str:
    """Hour buckets cut in UTC; day and month buckets cut in local wall time."""
    if interval not in UNITS:
        raise ValueError("interval not allowed")
    if interval == "hour":
        return f"date_trunc('hour', timezone('UTC', {aware_expr}))"
    zone = safe_tz(tz)
    if zone != tz:
        raise ValueError("time zone not allowed")
    return f"date_trunc('{interval}', timezone('{zone}', {aware_expr}))"


def staff(alias: str) -> str:
    return f"(coalesce({alias}.is_superuser, false) OR coalesce({alias}.is_demo_account, false))"


def invited(alias: str) -> str:
    return (f"(coalesce({alias}.is_invited_viewer, false) OR EXISTS "
            f"(SELECT 1 FROM invited_viewers iv WHERE iv.resulting_user_id = {alias}.id))")


def _no_staff_auth(id_expr: str, as_text: bool = False) -> str:
    """Leaves out auth ids that belong to a staff profile."""
    left = "CAST(st.auth_user_id AS TEXT)" if as_text else "st.auth_user_id"
    return f" AND NOT EXISTS (SELECT 1 FROM users st WHERE {left} = {id_expr} AND {staff('st')})"


def _has_story(alias: str, published: bool = False) -> str:
    extra = " AND coalesce(e.is_published, false)" if published else ""
    return (f"EXISTS (SELECT 1 FROM events e WHERE e.author_id = {alias}.id"
            f" AND NOT coalesce(e.is_deleted, false){extra})")


def _count(cond: str) -> str:
    return f"sum(CASE WHEN {cond} THEN 1 ELSE 0 END)"


def run(db, sql: str, params: dict):
    """Execute with bound values; datetimes are bound as timestamptz (UTC)."""
    used = set(re.findall(r"(?<!:):([A-Za-z_]\w*)", sql))
    params = {k: v for k, v in params.items() if k in used}
    stmt = text(sql)
    stamps = [bindparam(k, type_=DateTime(timezone=True)) for k, v in params.items() if isinstance(v, datetime)]
    if stamps:
        stmt = stmt.bindparams(*stamps)
    return db.execute(stmt, params).mappings().all()


# ---------------------------------------------------------------- auth probe

PROBE_AUTH_USERS = ("SELECT au.id, au.email, au.created_at, au.deleted_at, au.email_confirmed_at,"
                    " au.last_sign_in_at, au.raw_app_meta_data FROM auth.users au LIMIT 1")
PROBE_AUDIT_LOGINS = (f"SELECT 1 AS found FROM auth.audit_log_entries e"
                      f" WHERE {ACTION} = 'login' AND e.created_at >= :since LIMIT 1")
PROBE_SESSIONS = "SELECT s.user_id, s.created_at FROM auth.sessions s LIMIT 1"


# ---------------------------------------------------------------- overview

def first_signup() -> str:
    return "SELECT min(u.created_at) AS first FROM users u"


def signups_started(interval: str, tz: str, include_staff: bool) -> str:
    where = "au.deleted_at IS NULL AND au.created_at >= :start AND au.created_at <= :end"
    if not include_staff:
        where += _no_staff_auth("au.id")
    return (f"SELECT {bucket(interval, tz, 'au.created_at')} AS b, count(*) AS started"
            f" FROM auth.users au WHERE {where} GROUP BY 1")


def signups_profiles(interval: str, tz: str, include_staff: bool, with_auth: bool) -> str:
    created = aware("u.created_at")
    if with_auth:
        is_email = f"u.auth_user_id IS NOT NULL AND {PROVIDER} = 'email'"
        is_google = f"u.auth_user_id IS NOT NULL AND {PROVIDER} = 'google'"
        is_other = f"u.auth_user_id IS NULL OR au.id IS NULL OR coalesce({PROVIDER}, '') NOT IN ('email', 'google')"
        methods = f"{_count(is_email)} AS email, {_count(is_google)} AS google, {_count(is_other)} AS other"
        joins = " LEFT JOIN auth.users au ON au.id = u.auth_user_id"
    else:
        methods = f"NULL AS email, NULL AS google, {_count('u.auth_user_id IS NULL')} AS other"
        joins = ""
    where = f"{created} >= :start AND {created} <= :end"
    if not include_staff:
        where += f" AND NOT {staff('u')}"
    return (f"SELECT {bucket(interval, tz, created)} AS b, count(*) AS profiles, {methods},"
            f" {_count(invited('u'))} AS invited"
            f" FROM users u{joins} WHERE {where} GROUP BY 1")


def funnel(include_staff: bool, with_auth: bool) -> str:
    """The cohort created in the window, and how far each has got by now."""
    tail = (f"{_count('u.id IS NOT NULL')} AS profiles,"
            f" {_count(_has_story('u'))} AS with_story,"
            f" {_count(_has_story('u', published=True))} AS with_published")
    no_staff = "" if include_staff else f" AND NOT {staff('u')}"
    if not with_auth:
        created = aware("u.created_at")
        return (f"SELECT 'all' AS method, NULL AS accounts, NULL AS confirmed, {tail}"
                f" FROM users u WHERE {created} >= :start AND {created} <= :end{no_staff}")
    return (f"SELECT CASE WHEN {PROVIDER} IN ('email', 'google') THEN {PROVIDER} ELSE 'other' END AS method,"
            f" count(*) AS accounts, {_count('au.email_confirmed_at IS NOT NULL')} AS confirmed, {tail}"
            f" FROM auth.users au LEFT JOIN users u ON u.auth_user_id = au.id"
            f" WHERE au.deleted_at IS NULL AND au.created_at >= :start AND au.created_at <= :end{no_staff}"
            f" GROUP BY 1")


def signins_audit(interval: str, tz: str, include_staff: bool) -> str:
    """Per bucket and actor; the caller adds up series and distinct totals in one scan."""
    where = f"{ACTION} IN ('login', 'token_refreshed') AND e.created_at >= :start AND e.created_at <= :end"
    if not include_staff:
        where += _no_staff_auth(ACTOR, as_text=True)
    login = f"{ACTION} = 'login'"
    google = f"{login} AND {TRAIT_PROVIDER} = 'google'"
    email = f"{login} AND {TRAIT_PROVIDER} = 'email'"
    return (f"SELECT {bucket(interval, tz, 'e.created_at')} AS b, {ACTOR} AS actor,"
            f" {_count(login)} AS logins, {_count(google)} AS google, {_count(email)} AS email"
            f" FROM auth.audit_log_entries e WHERE {where} GROUP BY 1, 2")


def signins_sessions(interval: str, tz: str, include_staff: bool) -> str:
    """Fallback: a session row per sign-in. Sessions that were signed out are gone."""
    where = "s.created_at >= :start AND s.created_at <= :end"
    if not include_staff:
        where += _no_staff_auth("s.user_id")
    google = f"{PROVIDER} = 'google'"
    email = f"{PROVIDER} = 'email'"
    return (f"SELECT {bucket(interval, tz, 's.created_at')} AS b, CAST(s.user_id AS TEXT) AS actor,"
            f" count(*) AS logins, {_count(google)} AS google, {_count(email)} AS email"
            f" FROM auth.sessions s LEFT JOIN auth.users au ON au.id = s.user_id WHERE {where} GROUP BY 1, 2")


def last_active(with_auth: bool) -> str:
    """GREATEST ignores NULLs on Postgres (and in the SQLite shim)."""
    if with_auth:
        return f"greatest({aware('u.last_login')}, au.last_sign_in_at)"
    return aware("u.last_login")


def activity(include_staff: bool, with_auth: bool) -> str:
    la = last_active(with_auth)
    if with_auth:
        signed = (f"{_count('au.last_sign_in_at >= :since_24h')} AS signed_in_24h,"
                  f" {_count('au.last_sign_in_at >= :since_7d')} AS signed_in_7d")
        joins = " LEFT JOIN auth.users au ON au.id = u.auth_user_id"
    else:
        signed = "NULL AS signed_in_24h, NULL AS signed_in_7d"
        joins = ""
    where = "" if include_staff else f" WHERE NOT {staff('u')}"
    return (f"SELECT count(*) AS members,"
            f" {_count(la + ' >= :since_24h')} AS active_24h,"
            f" {_count(la + ' >= :since_7d')} AS active_7d,"
            f" {_count(la + ' >= :since_30d')} AS active_30d,"
            f" {signed},"
            f" {_count('u.last_login IS NOT NULL')} AS last_login_rows,"
            f" max(u.last_login) AS last_login_latest"
            f" FROM users u{joins}{where}")


# ---------------------------------------------------------------- members

def plan_state() -> str:
    return ("CASE WHEN coalesce(u.invited_viewer_mode, false) THEN 'viewer'"
            " WHEN u.subscription_status = 'active' AND u.subscription_tier IN ('premium', 'family') THEN 'paid'"
            " WHEN u.subscription_status = 'canceled' THEN 'canceled'"
            " WHEN u.trial_end_date IS NULL THEN 'legacy'"
            f" WHEN {aware('u.trial_end_date')} >= :now THEN 'trial'"
            " ELSE 'trial_ended' END")


def _stories(published: bool = False) -> str:
    extra = " AND coalesce(e.is_published, false)" if published else ""
    return (f"(SELECT count(*) FROM events e WHERE e.author_id = u.id"
            f" AND NOT coalesce(e.is_deleted, false){extra})")


def escape_like(q: str) -> str:
    """Lower-case, escape LIKE wildcards (with \\), wrap in %."""
    q = q.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{q}%"


def _sort_expr(sort: str, with_auth: bool):
    exprs = {
        "joined": "u.created_at",
        "last_active": last_active(with_auth),
        "last_sign_in": "au.last_sign_in_at" if with_auth else None,
        "stories": _stories(),
        "name": "lower(coalesce(nullif(u.display_name, ''), u.username))",
    }
    if sort not in exprs:
        raise ValueError("sort not allowed")
    return exprs[sort]


def members(f, with_auth: bool) -> tuple:
    """(page sql, count sql). `f` is the validated MembersQuery.
    One statement; the total comes from count(*) OVER ()."""
    la = last_active(with_auth)
    conds = []
    if f.q:
        conds.append("(" + " OR ".join(
            f"lower(coalesce({c}, '')) LIKE :q ESCAPE '\\'"
            for c in ("u.username", "u.email", "u.display_name", "u.full_name")) + ")")
    if f.method == "legacy":
        conds.append("u.auth_user_id IS NULL")
    elif f.method:
        conds.append(f"{PROVIDER} = :method" if with_auth else "1 = 0")
    if f.source == "invited":
        conds.append(invited("u"))
    elif f.source == "organic":
        conds.append(f"NOT {invited('u')}")
    if f.plan:
        conds.append(f"({plan_state()}) = :plan")
    if f.activity == "active_7d":
        conds.append(f"{la} >= :since_7d")
    elif f.activity == "quiet_30d":
        conds.append(f"({la} IS NULL OR {la} < :since_30d)")
    if f.stories == "has":
        conds.append(_has_story("u"))
    elif f.stories == "none":
        conds.append(f"NOT {_has_story('u')}")
    if f.confirmed is not None:
        if not with_auth:
            conds.append("1 = 0")
        elif f.confirmed:
            conds.append("au.email_confirmed_at IS NOT NULL")
        else:
            conds.append("au.id IS NOT NULL AND au.email_confirmed_at IS NULL")
    if f.joined != "all":
        conds.append(f"{aware('u.created_at')} >= :joined_since")
    if not f.include_staff:
        conds.append(f"NOT {staff('u')}")
    where = (" WHERE " + " AND ".join(conds)) if conds else ""

    if with_auth:
        auth_cols = (f"au.last_sign_in_at AS last_sign_in_at,"
                     f" CASE WHEN au.id IS NULL THEN NULL WHEN au.email_confirmed_at IS NOT NULL THEN 1 ELSE 0 END AS email_confirmed,"
                     f" CASE WHEN u.auth_user_id IS NULL THEN 'legacy'"
                     f" WHEN {PROVIDER} IN ('email', 'google') THEN {PROVIDER}"
                     f" WHEN au.id IS NULL THEN NULL ELSE 'other' END AS method")
        auth_join = " LEFT JOIN auth.users au ON au.id = u.auth_user_id"
    else:
        auth_cols = ("NULL AS last_sign_in_at, NULL AS email_confirmed,"
                     " CASE WHEN u.auth_user_id IS NULL THEN 'legacy' ELSE NULL END AS method")
        auth_join = ""

    sort = _sort_expr(f.sort, with_auth)
    direction = "ASC" if f.order == "asc" else "DESC"
    order = (f"{sort} {direction} NULLS LAST, u.id DESC") if sort else "u.id DESC"

    sql = (f"SELECT u.id, u.username, u.display_name, u.email, u.avatar_url,"
           f" {aware('u.created_at')} AS joined_at, {la} AS last_active_at, {auth_cols},"
           f" inv.id AS inviter_id, inv.username AS inviter_username, inv.display_name AS inviter_display_name,"
           f" {plan_state()} AS plan_state, u.subscription_tier AS plan_tier, u.subscription_status AS plan_status,"
           f" {aware('u.trial_end_date')} AS trial_ends_at,"
           f" {_stories()} AS stories, {_stories(published=True)} AS published,"
           f" coalesce(u.is_superuser, false) AS is_superuser,"
           f" count(*) OVER () AS total"
           f" FROM users u{auth_join}"
           f" LEFT JOIN users inv ON inv.id = (SELECT iv.inviter_id FROM invited_viewers iv"
           f" WHERE iv.resulting_user_id = u.id ORDER BY iv.id LIMIT 1)"
           f"{where} ORDER BY {order} LIMIT :limit OFFSET :offset")
    count_sql = f"SELECT count(*) AS total FROM users u{auth_join}{where}"
    return sql, count_sql


# ---------------------------------------------------------------- unfinished, staff

def unfinished() -> str:
    """Supabase accounts with no profile: where a broken sign-up shows."""
    return (f"SELECT au.created_at AS created_at,"
            f" CASE WHEN au.email_confirmed_at IS NOT NULL THEN 1 ELSE 0 END AS confirmed,"
            f" CASE WHEN {PROVIDER} IN ('email', 'google') THEN {PROVIDER} ELSE 'other' END AS method,"
            f" au.email AS email"
            f" FROM auth.users au"
            f" WHERE au.deleted_at IS NULL AND au.created_at >= :start AND au.created_at <= :end"
            f" AND NOT EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = au.id)"
            f" ORDER BY au.created_at DESC LIMIT 50")


def staff_ids() -> str:
    return f"SELECT u.id AS id FROM users u WHERE {staff('u')}"
