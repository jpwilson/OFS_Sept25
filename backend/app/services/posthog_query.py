"""
Visitor numbers from PostHog's query API, for the admin analytics page
(docs/app/ADMIN-ANALYTICS.md).

- The personal API key is read from settings on the server and sent only to PostHog.
- The PostHog project is shared with another app, so every query keeps to
  properties.app = 'ofs' and our own hosts.
- Values (times, hosts, staff ids, event names) are HogQL placeholders passed in
  `values`; only the whitelisted bucket function and time zone are in the text.
- Nothing here logs the key, a response body or an exception message.
"""
from time import monotonic

import requests

from .analytics_time import Window, fill, bucket_key, safe_tz

SITE_HOSTS = ["ourfamilysocials.com", "www.ourfamilysocials.com"]
CTA_EVENT = "landing_cta"
SIGNUP_EVENT = "signed_up"
TIMEOUT_S = 10.0
TOP_N = 10

REFERRER_LABELS = {
    "$direct": "Direct",
    "t.co": "X (Twitter)",
    "x.com": "X (Twitter)",
    "twitter.com": "X (Twitter)",
    "mobile.twitter.com": "X (Twitter)",
    "facebook.com": "Facebook",
    "www.facebook.com": "Facebook",
    "m.facebook.com": "Facebook",
    "l.facebook.com": "Facebook",
    "lm.facebook.com": "Facebook",
    "mail.google.com": "Gmail",
}


class PostHogError(Exception):
    """A failure with a reason that is safe to show the owner."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def referrer_label(domain: str) -> str:
    return REFERRER_LABELS.get((domain or "").lower(), domain)


def hogql(query: str, values: dict, *, host: str, project_id: str, key: str, timeout: float) -> list:
    """Run one HogQL query and return its result rows."""
    url = f"{host.rstrip('/')}/api/projects/{project_id}/query/"
    body = {"query": {"kind": "HogQLQuery", "query": query, "values": values}}
    try:
        resp = requests.post(url, json=body, headers={"Authorization": f"Bearer {key}"}, timeout=timeout)
    except requests.Timeout:
        raise PostHogError("PostHog did not answer (timeout)")
    except requests.RequestException:
        raise PostHogError("Could not reach PostHog")
    if resp.status_code in (401, 403):
        raise PostHogError(f"PostHog refused the key ({resp.status_code}). Check its scope and project.")
    if resp.status_code == 429:
        raise PostHogError("PostHog is limiting requests (429). Try again in a few minutes.")
    if resp.status_code != 200:
        raise PostHogError(f"PostHog returned an error ({resp.status_code})")
    try:
        results = resp.json()["results"]
    except (ValueError, KeyError, TypeError):
        raise PostHogError("PostHog sent an answer the server could not read")
    if not isinstance(results, list):
        raise PostHogError("PostHog sent an answer the server could not read")
    return results


# ---------------------------------------------------------------- HogQL text

def _bucket(interval: str, tz: str) -> str:
    if interval == "hour":
        return "toString(toStartOfHour(toTimeZone(timestamp, 'UTC')))"
    zone = safe_tz(tz)
    fn = {"day": "toStartOfDay", "month": "toStartOfMonth"}[interval]
    return f"toString({fn}(toTimeZone(timestamp, '{zone}')))"


def _where(events_clause: str, exclude_staff: bool) -> str:
    where = (f"{events_clause} AND properties.app = 'ofs' AND properties.$host IN {{hosts}}"
             " AND timestamp >= toDateTime({start}, 'UTC') AND timestamp <= toDateTime({end}, 'UTC')")
    if exclude_staff:
        where += " AND person_id NOT IN (SELECT person_id FROM person_distinct_ids WHERE distinct_id IN {staff})"
    return where


PAGEVIEW = "event = '$pageview'"


def build_queries(window: Window, exclude_staff: bool) -> dict:
    pv = _where(PAGEVIEW, exclude_staff)
    return {
        "series": (f"SELECT {_bucket(window.interval, window.tz)} AS b, count(DISTINCT person_id) AS visitors,"
                   f" count() AS pageviews FROM events WHERE {pv} GROUP BY b ORDER BY b"),
        "totals": f"SELECT count(DISTINCT person_id) AS visitors, count() AS pageviews FROM events WHERE {pv}",
        "actions": ("SELECT countIf(event = {cta}) AS landing_cta, countIf(event = {signup}) AS signed_up"
                    f" FROM events WHERE {_where('event IN {actions}', exclude_staff)}"),
        "referrers": ("SELECT properties.$referring_domain AS domain, count(DISTINCT person_id) AS visitors"
                      f" FROM events WHERE {pv} AND properties.$referring_domain NOT IN {{hosts}}"
                      f" GROUP BY domain ORDER BY visitors DESC LIMIT {TOP_N}"),
        "utm_sources": ("SELECT properties.utm_source AS source, count(DISTINCT person_id) AS visitors"
                        f" FROM events WHERE {pv} AND properties.utm_source != ''"
                        f" GROUP BY source ORDER BY visitors DESC LIMIT {TOP_N}"),
    }


def build_values(window: Window, staff_distinct_ids: list) -> dict:
    values = {
        "hosts": list(SITE_HOSTS),
        "start": window.start.strftime("%Y-%m-%d %H:%M:%S"),
        "end": window.end.strftime("%Y-%m-%d %H:%M:%S"),
        "cta": CTA_EVENT,
        "signup": SIGNUP_EVENT,
        "actions": [CTA_EVENT, SIGNUP_EVENT],
    }
    if staff_distinct_ids:
        values["staff"] = list(staff_distinct_ids)
    return values


def visitor_report(window: Window, staff_user_ids: list, *, host: str, project_id: str, key: str) -> dict:
    """Series, totals, referrers and UTM sources. Raises PostHogError.
    The five queries share one 10 s budget."""
    staff = [f"user_{int(i)}" for i in staff_user_ids]
    queries = build_queries(window, exclude_staff=bool(staff))
    values = build_values(window, staff)
    deadline = monotonic() + TIMEOUT_S

    def ask(name):
        remaining = deadline - monotonic()
        if remaining <= 0:
            raise PostHogError("PostHog did not answer (timeout)")
        return hogql(queries[name], values, host=host, project_id=project_id, key=key, timeout=remaining)

    try:
        rows = {}
        for r in ask("series"):
            k = bucket_key(r[0])
            if k is not None:
                rows[k] = {"visitors": r[1], "pageviews": r[2]}
        totals_row = (ask("totals") or [[0, 0]])[0]
        actions_row = (ask("actions") or [[0, 0]])[0]
        referrers = [
            {"domain": str(r[0]), "label": referrer_label(str(r[0])), "visitors": int(r[1] or 0)}
            for r in ask("referrers") if r and r[0]
        ]
        utm = [{"source": str(r[0]), "visitors": int(r[1] or 0)} for r in ask("utm_sources") if r and r[0]]
        return {
            "series": fill(window, rows, ("visitors", "pageviews")),
            "totals": {
                "visitors": int(totals_row[0] or 0),
                "pageviews": int(totals_row[1] or 0),
                "landing_cta": int(actions_row[0] or 0),
                "signed_up": int(actions_row[1] or 0),
            },
            "referrers": referrers,
            "utm_sources": utm,
        }
    except PostHogError:
        raise
    except (ValueError, TypeError, IndexError, KeyError):
        raise PostHogError("PostHog sent an answer the server could not read")
