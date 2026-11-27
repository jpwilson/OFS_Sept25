"""
Time windows and buckets for the admin analytics page (docs/app/ADMIN-ANALYTICS.md).
Pure functions: no database, no network, no clock (the caller passes `now`).

- Hour buckets are cut in UTC and labelled in local time with their offset, so the two
  1 AM hours of a fall-back night stay apart.
- Day and month buckets are cut in local wall-clock time.
- Every output time carries an offset or Z.
"""
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from typing import Iterable, Mapping, Optional
from zoneinfo import ZoneInfo, available_timezones

UTC = timezone.utc
DEFAULT_TZ = "America/Chicago"
DEFAULT_RANGE = "7d"

# range -> allowed intervals, default first
RANGES = {
    "24h": ("hour",),
    "7d": ("day", "hour"),
    "30d": ("day",),
    "90d": ("day", "month"),
    "all": ("month", "day"),
}
_DAYS = {"7d": 7, "30d": 30, "90d": 90}
_TZ_NAME = re.compile(r"^[A-Za-z]+(?:/[A-Za-z0-9_+\-]+){0,2}$")


@lru_cache(maxsize=1)
def _zones() -> frozenset:
    return frozenset(available_timezones())


def safe_tz(name: Optional[str]) -> str:
    """The configured zone if it is a real IANA name, else America/Chicago.
    The result is safe to place in SQL text."""
    if name and _TZ_NAME.match(name) and name in _zones():
        return name
    return DEFAULT_TZ


def normalize(range_: Optional[str], interval: Optional[str]) -> tuple:
    """(range, interval) after falling back to the defaults."""
    r = range_ if range_ in RANGES else DEFAULT_RANGE
    i = interval if interval in RANGES[r] else RANGES[r][0]
    return r, i


def as_utc(value: datetime) -> datetime:
    """Aware UTC. Naive values are UTC (that is how public.* stores them)."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def parse_ts(value) -> Optional[datetime]:
    """A database timestamp (datetime, or a string from SQLite) as aware UTC."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return as_utc(value)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=UTC)
    text = str(value).strip().replace("Z", "+00:00")
    return as_utc(datetime.fromisoformat(text))


def utc_z(value) -> Optional[str]:
    """'2026-11-27T20:05:12Z', or None."""
    dt = parse_ts(value)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else None


def label(value: datetime, tz: str = DEFAULT_TZ) -> str:
    """Local time with its offset: '2026-11-21T00:00:00-06:00'."""
    return as_utc(value).astimezone(ZoneInfo(tz)).isoformat(timespec="seconds")


def bucket_key(value) -> Optional[datetime]:
    """Normalise a GROUP BY bucket (Postgres datetime, SQLite string, PostHog string)
    to the naive datetime used as a Bucket.key."""
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, date):
        dt = datetime(value.year, value.month, value.day)
    else:
        dt = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(UTC).replace(tzinfo=None)
    return dt.replace(microsecond=0)


@dataclass(frozen=True)
class Bucket:
    key: datetime  # naive: the UTC hour (hour) or the local start (day, month), as SQL groups it
    start: datetime  # aware UTC
    t: str  # label, local time with offset


@dataclass(frozen=True)
class Window:
    range: str
    interval: str
    tz: str
    start: datetime  # aware UTC
    end: datetime  # aware UTC (now)
    buckets: tuple

    @property
    def start_label(self) -> str:
        return label(self.start, self.tz)

    @property
    def end_label(self) -> str:
        return label(self.end, self.tz)


def _floor_hour(dt: datetime) -> datetime:
    return dt.replace(minute=0, second=0, microsecond=0)


def _local_start(d: date, zone: ZoneInfo) -> datetime:
    """Aware UTC instant of local midnight on d."""
    return datetime(d.year, d.month, d.day, tzinfo=zone).astimezone(UTC)


def _next_month(d: date) -> date:
    return date(d.year + (d.month == 12), d.month % 12 + 1, 1)


def _buckets(interval: str, start: datetime, now: datetime, tz: str) -> tuple:
    zone = ZoneInfo(tz)
    out = []
    if interval == "hour":
        cur = _floor_hour(start)
        while cur <= now:
            out.append(Bucket(cur.replace(tzinfo=None), cur, label(cur, tz)))
            cur += timedelta(hours=1)
    else:
        d = start.astimezone(zone).date()
        if interval == "month":
            d = d.replace(day=1)
        while True:
            begin = _local_start(d, zone)
            if begin > now:
                break
            out.append(Bucket(datetime(d.year, d.month, d.day), begin, label(begin, tz)))
            d = _next_month(d) if interval == "month" else d + timedelta(days=1)
    return tuple(out)


def resolve_window(range_: Optional[str], interval: Optional[str], now: datetime,
                   tz: str = DEFAULT_TZ, first: Optional[datetime] = None) -> Window:
    """The window and buckets for a range preset.

    24h  floor_hour(now) - 23h ... now
    7d   local midnight - 6 days ... now     (30d: - 29 days, 90d: - 89 days)
    all  the first sign-up (`first`), floored to the interval, ... now
    """
    tz = safe_tz(tz)
    zone = ZoneInfo(tz)
    range_, interval = normalize(range_, interval)
    now = as_utc(now)
    if range_ == "24h":
        start = _floor_hour(now) - timedelta(hours=23)
    elif range_ in _DAYS:
        start = _local_start(now.astimezone(zone).date() - timedelta(days=_DAYS[range_] - 1), zone)
    else:
        first_utc = min(as_utc(first), now) if first else now
        d = first_utc.astimezone(zone).date()
        if interval == "month":
            d = d.replace(day=1)
        start = _local_start(d, zone)
    return Window(range_, interval, tz, start, now, _buckets(interval, start, now, tz))


def fill(window: Window, rows: Mapping, fields: Iterable[str], nulls: Iterable[str] = ()) -> list:
    """One point per bucket, zero-filled; the last bucket is partial.
    rows maps Bucket.key -> {field: value}. Fields in `nulls` are always None."""
    fields = list(fields)
    nulls = set(nulls)
    last = len(window.buckets) - 1
    series = []
    for i, b in enumerate(window.buckets):
        row = rows.get(b.key) or {}
        point = {"t": b.t, "partial": i == last}
        for f in fields:
            point[f] = None if f in nulls else int(row.get(f) or 0)
        series.append(point)
    return series
