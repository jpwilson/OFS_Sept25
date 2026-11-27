"""
Admin analytics API (docs/app/ADMIN-ANALYTICS.md): windows, numbers, members, access,
PostHog, the last-login throttle and the frontend contract.

    cd backend && .venv/bin/python -m unittest tests.test_admin_analytics -v
"""
import contextlib
import io
import json
import logging
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

import requests
from fastapi.testclient import TestClient
from sqlalchemy import event as sa_event

from analytics_fixture import NOW, UTC, add_member, build_dataset, make_session, utc
from helpers import make_session as plain_session, add_user

from app.api import admin_analytics as api
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import _update_last_login, get_current_user
from app.models.user import User
from app.services import analytics_sql
from app.services.analytics_time import bucket_key, fill, label, resolve_window, utc_z

BASE = "/api/v1/admin/analytics"
CONTRACT = Path(__file__).resolve().parents[2] / "frontend/scripts/daylight/fixtures/admin-contract.json"


class _ApiCase(unittest.TestCase):
    with_auth = True
    audit = True
    sessions = False

    def make_db(self):
        """The test database; test_admin_analytics_pg.py swaps in Postgres."""
        return make_session(with_auth=self.with_auth)

    def setUp(self):
        api.reset_caches()
        self.db = self.make_db()
        self.m, self.a = build_dataset(self.db, with_auth=self.with_auth, audit=self.audit, sessions=self.sessions)
        clock = mock.patch.object(api, "_now", return_value=NOW)
        clock.start()
        self.addCleanup(clock.stop)
        from app.main import app
        self.app = app
        app.dependency_overrides[get_db] = lambda: self.db
        self.as_user(self.m["owner"])
        self.client = TestClient(app)

    def tearDown(self):
        self.app.dependency_overrides.clear()
        api.reset_caches()
        self.db.close()

    def as_user(self, user):
        self.app.dependency_overrides[get_current_user] = lambda: user

    def get(self, path, **params):
        r = self.client.get(BASE + path, params=params)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def members(self, **body):
        r = self.client.post(BASE + "/members", json=body)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def names(self, **body):
        return [m["username"] for m in self.members(**body)["members"]]


# ---------------------------------------------------------------- windows (pure)

class WindowTest(unittest.TestCase):
    def test_every_preset(self):
        w = resolve_window("24h", None, NOW)
        self.assertEqual((w.interval, len(w.buckets)), ("hour", 24))
        self.assertEqual(w.start, datetime(2026, 11, 26, 21, tzinfo=UTC))  # floor_hour(now) - 23h
        self.assertEqual(w.buckets[-1].t, "2026-11-27T14:00:00-06:00")
        for rng, n in (("7d", 7), ("30d", 30), ("90d", 90)):
            w = resolve_window(rng, None, NOW)
            self.assertEqual((w.interval, len(w.buckets)), ("day", n), rng)
            self.assertTrue(w.buckets[0].t.endswith("T00:00:00-06:00") or w.buckets[0].t.endswith("T00:00:00-05:00"))
            self.assertEqual(w.buckets[-1].t, "2026-11-27T00:00:00-06:00")
        self.assertEqual(resolve_window("7d", None, NOW).start_label, "2026-11-21T00:00:00-06:00")
        self.assertEqual(resolve_window("30d", None, NOW).start_label, "2026-10-29T00:00:00-05:00")
        self.assertEqual(len(resolve_window("7d", "hour", NOW).buckets), 7 * 24 - 9)  # midnight 21 Nov .. 2 pm 27 Nov
        months = resolve_window("90d", "month", NOW)
        self.assertEqual([b.t[:10] for b in months.buckets], ["2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"])
        first = datetime(2026, 6, 1, 12)
        self.assertEqual(len(resolve_window("all", None, NOW, first=first).buckets), 6)
        self.assertEqual(resolve_window("all", None, NOW, first=first).start_label, "2026-06-01T00:00:00-05:00")
        self.assertEqual(resolve_window("all", "day", NOW, first=first).buckets[0].t, "2026-06-01T00:00:00-05:00")
        self.assertEqual(len(resolve_window("all", None, NOW).buckets), 1)  # no members yet

    def test_unknown_interval_and_range_fall_back(self):
        self.assertEqual(resolve_window("24h", "day", NOW).interval, "hour")
        self.assertEqual(resolve_window("30d", "month", NOW).interval, "day")
        w = resolve_window("bogus", None, NOW)
        self.assertEqual((w.range, w.interval), ("7d", "day"))

    def test_fall_back_keeps_both_1am_hours(self):
        now = datetime(2026, 11, 8, 5, 30, tzinfo=UTC)  # 11:30 pm on 7 Nov in Chicago
        w = resolve_window("7d", "hour", now)
        self.assertEqual(len(w.buckets), 169)
        labels = [b.t for b in w.buckets]
        self.assertIn("2026-11-01T01:00:00-05:00", labels)
        self.assertIn("2026-11-01T01:00:00-06:00", labels)
        self.assertEqual(len(set(labels)), 169)
        days = resolve_window("7d", "day", now)
        self.assertEqual(len(days.buckets), 7)
        self.assertEqual(days.buckets[1].start - days.buckets[0].start, timedelta(hours=25))

    def test_spring_forward_skips_2am(self):
        now = datetime(2026, 3, 15, 4, 30, tzinfo=UTC)  # 11:30 pm on 14 Mar in Chicago
        w = resolve_window("7d", "hour", now)
        self.assertEqual(len(w.buckets), 167)
        labels = [b.t for b in w.buckets]
        self.assertNotIn("2026-03-08T02:00:00-06:00", labels)
        self.assertIn("2026-03-08T01:00:00-06:00", labels)
        self.assertIn("2026-03-08T03:00:00-05:00", labels)
        days = resolve_window("7d", "day", now)
        self.assertEqual(days.buckets[1].start - days.buckets[0].start, timedelta(hours=23))

    def test_fill_zero_fills_and_marks_the_last_bucket(self):
        w = resolve_window("7d", None, NOW)
        series = fill(w, {w.buckets[2].key: {"n": 4}}, ("n",), nulls=("x",))
        self.assertEqual([p["n"] for p in series], [0, 0, 4, 0, 0, 0, 0])
        self.assertEqual([p["partial"] for p in series], [False] * 6 + [True])
        self.assertIsNone(fill(w, {}, ("x",), nulls=("x",))[0]["x"])

    def test_output_times_carry_an_offset(self):
        self.assertEqual(utc_z(datetime(2026, 11, 27, 20, 5, 12)), "2026-11-27T20:05:12Z")
        self.assertEqual(utc_z("2026-11-27 20:05:12.000000+00:00"), "2026-11-27T20:05:12Z")
        self.assertEqual(label(NOW), "2026-11-27T14:05:12-06:00")


class BucketSqlTest(unittest.TestCase):
    """The SQL bucket expressions, through the same text Postgres runs."""

    with_auth = True

    def make_db(self):
        return make_session()

    def setUp(self):
        self.db = self.make_db()

    def tearDown(self):
        self.db.close()

    def _buckets(self, interval, now):
        w = resolve_window("7d", interval, now)
        q = (f"SELECT {analytics_sql.bucket(interval, w.tz, analytics_sql.aware('u.created_at'))} AS b,"
             f" count(*) AS n FROM users u GROUP BY 1")
        rows = {bucket_key(r["b"]): {"n": r["n"]} for r in analytics_sql.run(self.db, q, {})}
        return {p["t"]: p["n"] for p in fill(w, rows, ("n",)) if p["n"]}

    def test_half_past_midnight_in_chicago_lands_on_its_own_day(self):
        add_member(self.db, "early", utc(2026, 11, 22, 6, 30))  # 00:30 on 22 Nov in Chicago
        add_member(self.db, "late", utc(2026, 11, 22, 5, 30))  # 23:30 on 21 Nov in Chicago
        self.db.commit()
        self.assertEqual(self._buckets("day", NOW), {"2026-11-21T00:00:00-06:00": 1, "2026-11-22T00:00:00-06:00": 1})

    def test_hour_buckets_keep_the_two_1am_hours_apart(self):
        add_member(self.db, "first1am", utc(2026, 11, 1, 6, 10))  # 1:10 am CDT
        add_member(self.db, "second1am", utc(2026, 11, 1, 7, 10))  # 1:10 am CST
        self.db.commit()
        got = self._buckets("hour", datetime(2026, 11, 8, 5, 30, tzinfo=UTC))
        self.assertEqual(got, {"2026-11-01T01:00:00-05:00": 1, "2026-11-01T01:00:00-06:00": 1})

    def test_greatest_ignores_nulls(self):
        q = "SELECT greatest(NULL, '2026-01-02 00:00:00.000000+00:00', '2026-01-01 00:00:00.000000+00:00') AS g, greatest(NULL, NULL) AS n"
        r = analytics_sql.run(self.db, q, {})[0]
        self.assertEqual((r["g"][:10], r["n"]), ("2026-01-02", None))

    def test_interval_and_zone_come_from_whitelists(self):
        with self.assertRaises(ValueError):
            analytics_sql.bucket("week", "America/Chicago", "x")
        with self.assertRaises(ValueError):
            analytics_sql.bucket("day", "x'); DROP TABLE users; --", "x")

    def test_like_escaping(self):
        self.assertEqual(analytics_sql.escape_like("A%b_c\\"), "%a\\%b\\_c\\\\%")


# ---------------------------------------------------------------- overview numbers

class OverviewTest(_ApiCase):
    def test_shape_and_window(self):
        o = self.get("/overview")
        self.assertEqual((o["range"], o["interval"], o["tz"]), ("7d", "day", "America/Chicago"))
        self.assertEqual(o["start"], "2026-11-21T00:00:00-06:00")
        self.assertEqual(o["end"], "2026-11-27T14:05:12-06:00")
        self.assertEqual(o["generated_at"], "2026-11-27T20:05:12Z")
        self.assertEqual(o["sources"], {"auth": True, "signins": "audit_log"})
        self.assertEqual(len(o["signups"]["series"]), 7)
        self.assertTrue(o["signups"]["series"][-1]["partial"])

    def test_interval_echo(self):
        self.assertEqual(self.get("/overview", range="24h", interval="day")["interval"], "hour")
        self.assertEqual(len(self.get("/overview", range="7d", interval="hour")["signups"]["series"]), 159)

    def test_signups(self):
        s = self.get("/overview")["signups"]
        self.assertEqual(s["totals"], {"started": 4, "profiles": 2, "email": 1, "google": 1, "other": 0,
                                       "invited": 1, "organic": 1})
        by_day = {p["t"][:10]: p for p in s["series"]}
        self.assertEqual(by_day["2026-11-21"]["started"], 1)  # ann: 11:30 pm Chicago on the 21st
        self.assertEqual(by_day["2026-11-21"]["email"], 1)
        self.assertEqual((by_day["2026-11-23"]["started"], by_day["2026-11-23"]["profiles"]), (1, 0))
        self.assertEqual((by_day["2026-11-27"]["google"], by_day["2026-11-27"]["invited"]), (1, 1))
        self.assertEqual(by_day["2026-11-24"]["started"], 0)

    def test_staff_are_left_out_unless_asked(self):
        s = self.get("/overview", include_staff="true")["signups"]["totals"]
        self.assertEqual(s, {"started": 5, "profiles": 4, "email": 1, "google": 2, "other": 1,
                             "invited": 1, "organic": 3})
        f = self.get("/overview", include_staff="true")["funnel"]["steps"]
        self.assertEqual(f["accounts"], 5)

    def test_funnel_is_a_cohort(self):
        f = self.get("/overview")["funnel"]
        self.assertEqual(f["steps"], {"accounts": 4, "confirmed": 3, "profiles": 2, "with_story": 2, "with_published": 1})
        self.assertEqual(f["by_method"]["email"], {"accounts": 2, "confirmed": 1, "profiles": 1, "with_story": 1, "with_published": 0})
        self.assertEqual(f["by_method"]["google"], {"accounts": 2, "confirmed": 2, "profiles": 1, "with_story": 1, "with_published": 1})
        self.assertEqual(f["unfinished"], 2)

    def test_signins_from_the_audit_log(self):
        s = self.get("/overview")["signins"]
        self.assertEqual(s["totals"], {"signins": 3, "members": 2, "active": 3})
        self.assertIsNone(s["note"])
        by_day = {p["t"][:10]: p for p in s["series"]}
        self.assertEqual(by_day["2026-11-22"], {"t": "2026-11-22T00:00:00-06:00", "partial": False, "signins": 1,
                                                "members": 1, "google": 0, "email": 1, "active": 1})
        self.assertEqual((by_day["2026-11-25"]["signins"], by_day["2026-11-25"]["active"]), (0, 1))
        self.assertEqual((by_day["2026-11-27"]["google"], by_day["2026-11-27"]["partial"]), (1, True))
        staff = self.get("/overview", include_staff="true")["signins"]["totals"]
        self.assertEqual(staff, {"signins": 4, "members": 3, "active": 4})

    def test_all_range_caps_the_audit_log(self):
        o = self.get("/overview", range="all")
        self.assertEqual((o["interval"], o["start"]), ("month", "2026-06-01T00:00:00-05:00"))
        self.assertEqual(len(o["signups"]["series"]), 6)
        self.assertIn("90 days", o["signins"]["note"])
        self.assertEqual(o["signins"]["totals"]["signins"], 4)

    def test_activity(self):
        a = self.get("/overview")["activity"]
        self.assertEqual(a, {"members": 6, "active_24h": 1, "active_7d": 2, "active_30d": 3,
                             "signed_in_24h": 1, "signed_in_7d": 2, "last_login_rows": 2,
                             "last_login_latest": "2026-11-27T19:00:00Z"})
        staff = self.get("/overview", include_staff="true")["activity"]
        self.assertEqual((staff["members"], staff["active_24h"], staff["last_login_latest"]),
                         (8, 2, "2026-11-27T19:30:00Z"))

    def test_results_are_cached_for_a_minute(self):
        first = self.get("/overview")
        add_member(self.db, "newbie", utc(2026, 11, 27, 20))
        self.db.commit()
        self.assertEqual(self.get("/overview")["signups"]["totals"], first["signups"]["totals"])
        api.reset_caches()
        self.assertEqual(self.get("/overview")["signups"]["totals"]["profiles"], 3)


class SessionsFallbackTest(_ApiCase):
    audit = False
    sessions = True

    def test_signins_from_sessions(self):
        o = self.get("/overview")
        self.assertEqual(o["sources"], {"auth": True, "signins": "sessions"})
        s = o["signins"]
        self.assertEqual(s["totals"], {"signins": 3, "members": 2, "active": None})
        self.assertIn("signed out", s["note"])
        by_day = {p["t"][:10]: p for p in s["series"]}
        self.assertEqual(by_day["2026-11-22"], {"t": "2026-11-22T00:00:00-06:00", "partial": False, "signins": 1,
                                                "members": 1, "google": 0, "email": 1, "active": None})
        self.assertEqual(by_day["2026-11-27"]["google"], 1)


class NoAuthSchemaTest(_ApiCase):
    with_auth = False

    def test_overview_nulls_not_500(self):
        o = self.get("/overview")
        self.assertEqual(o["sources"], {"auth": False, "signins": None})
        t = o["signups"]["totals"]
        # nobody is linked in this data set, so both new profiles count as other (legacy)
        self.assertEqual(t, {"started": None, "profiles": 2, "email": None, "google": None, "other": 2,
                             "invited": 1, "organic": 1})
        self.assertIsNone(o["signups"]["series"][0]["started"])
        f = o["funnel"]
        self.assertEqual(f["steps"], {"accounts": None, "confirmed": None, "profiles": 2, "with_story": 2,
                                      "with_published": 1})
        self.assertIsNone(f["unfinished"])
        self.assertEqual(set(f["by_method"]), {"email", "google"})
        self.assertEqual(o["signins"]["totals"], {"signins": None, "members": None, "active": None})
        self.assertIsNone(o["signins"]["series"][0]["signins"])
        self.assertTrue(o["signins"]["note"])
        self.assertEqual((o["activity"]["signed_in_24h"], o["activity"]["active_24h"]), (None, 1))

    def test_members_and_unfinished(self):
        page = self.members()
        self.assertEqual((page["sources"], page["total"]), ({"auth": False}, 6))
        ruth = next(m for m in page["members"] if m["username"] == "ruth")
        self.assertEqual((ruth["last_sign_in_at"], ruth["email_confirmed"]), (None, None))
        self.assertEqual(self.names(method="legacy"), ["ruth", "ann", "tom", "paula", "c_arl", "vera"])
        self.assertEqual(self.names(sort="last_sign_in"), ["vera", "c_arl", "paula", "ruth", "ann", "tom"])
        self.assertEqual(self.get("/unfinished"), {"available": False, "accounts": []})


# ---------------------------------------------------------------- members

class MembersTest(_ApiCase):
    def test_default_page(self):
        page = self.members()
        self.assertEqual((page["total"], page["page"], page["page_size"], page["sources"]), (6, 1, 25, {"auth": True}))
        self.assertEqual([m["username"] for m in page["members"]], ["ruth", "ann", "tom", "paula", "c_arl", "vera"])
        ruth = page["members"][0]
        self.assertEqual(ruth, {
            "id": self.m["ruth"].id, "username": "ruth", "display_name": "Ruth", "email": "ruth@example.com",
            "avatar_url": None, "joined_at": "2026-11-27T15:04:00Z", "last_sign_in_at": "2026-11-27T15:04:10Z",
            "last_active_at": "2026-11-27T19:00:00Z", "email_confirmed": True, "method": "google",
            "invited_by": {"id": self.m["tom"].id, "username": "tom", "display_name": None},
            "plan": {"state": "trial", "tier": "free", "status": "trial", "trial_ends_at": "2026-12-27T15:04:00Z"},
            "stories": 2, "published": 1, "is_superuser": False})
        by_name = {m["username"]: m for m in page["members"]}
        self.assertEqual((by_name["tom"]["method"], by_name["tom"]["email_confirmed"]), ("legacy", None))
        self.assertEqual(by_name["ann"]["last_active_at"], "2026-11-26T12:00:00Z")  # sign-in beats a null last_login
        self.assertEqual(by_name["paula"]["email_confirmed"], False)

    def test_search(self):
        self.assertEqual(self.names(q="RU"), ["ruth"])
        self.assertEqual(self.names(q="gran"), ["paula"])  # display name
        self.assertEqual(self.names(q="ann@example"), ["ann"])  # email
        self.assertEqual(self.names(q="%"), ["paula"])  # a literal %, not a wildcard
        self.assertEqual(self.names(q="_"), ["c_arl"])  # a literal _, not a wildcard
        self.assertEqual(self.names(q="   "), ["ruth", "ann", "tom", "paula", "c_arl", "vera"])

    def test_every_filter(self):
        self.assertEqual(self.names(method="email"), ["ann", "paula"])
        self.assertEqual(self.names(method="google"), ["ruth"])
        self.assertEqual(self.names(method="legacy"), ["tom", "c_arl", "vera"])
        self.assertEqual(self.names(source="invited"), ["ruth", "vera"])
        self.assertEqual(self.names(source="organic"), ["ann", "tom", "paula", "c_arl"])
        for plan, who in (("trial", ["ruth"]), ("trial_ended", ["ann"]), ("paid", ["paula"]),
                          ("canceled", ["c_arl"]), ("viewer", ["vera"]), ("legacy", ["tom"])):
            self.assertEqual(self.names(plan=plan), who, plan)
        self.assertEqual(self.names(activity="active_7d"), ["ruth", "ann"])
        self.assertEqual(self.names(activity="quiet_30d"), ["paula", "c_arl", "vera"])
        self.assertEqual(self.names(stories="has"), ["ruth", "ann", "tom"])
        self.assertEqual(self.names(stories="none"), ["paula", "c_arl", "vera"])
        self.assertEqual(self.names(confirmed=True), ["ruth", "ann"])
        self.assertEqual(self.names(confirmed=False), ["paula"])
        self.assertEqual(self.names(joined="24h"), ["ruth"])
        self.assertEqual(self.names(joined="7d"), ["ruth", "ann"])
        self.assertEqual(self.names(joined="90d"), ["ruth", "ann", "tom", "paula"])
        self.assertEqual(self.names(include_staff=True), ["ruth", "owner", "demo", "ann", "tom", "paula", "c_arl", "vera"])
        self.assertEqual(self.names(method="email", stories="has", joined="7d"), ["ann"])

    def test_every_sort_with_nulls_last(self):
        cases = {
            ("joined", "desc"): ["ruth", "ann", "tom", "paula", "c_arl", "vera"],
            ("joined", "asc"): ["vera", "c_arl", "paula", "tom", "ann", "ruth"],
            ("last_active", "desc"): ["ruth", "ann", "tom", "paula", "vera", "c_arl"],
            ("last_active", "asc"): ["paula", "tom", "ann", "ruth", "vera", "c_arl"],
            ("last_sign_in", "desc"): ["ruth", "ann", "paula", "vera", "c_arl", "tom"],
            ("last_sign_in", "asc"): ["paula", "ann", "ruth", "vera", "c_arl", "tom"],
            ("stories", "desc"): ["tom", "ruth", "ann", "vera", "c_arl", "paula"],
            ("stories", "asc"): ["vera", "c_arl", "paula", "ann", "ruth", "tom"],
            ("name", "asc"): ["paula", "ann", "c_arl", "ruth", "tom", "vera"],
            ("name", "desc"): ["vera", "tom", "ruth", "c_arl", "ann", "paula"],
        }
        for (sort, order), who in cases.items():
            self.assertEqual(self.names(sort=sort, order=order), who, f"{sort} {order}")

    def test_paging_and_total(self):
        p1 = self.members(page_size=4)
        p2 = self.members(page_size=4, page=2)
        p3 = self.members(page_size=4, page=3)
        self.assertEqual([p["total"] for p in (p1, p2, p3)], [6, 6, 6])
        self.assertEqual([len(p["members"]) for p in (p1, p2, p3)], [4, 2, 0])
        self.assertEqual([m["username"] for m in p1["members"] + p2["members"]],
                         ["ruth", "ann", "tom", "paula", "c_arl", "vera"])
        self.assertEqual(self.members(page_size=1000)["page_size"], 100)
        self.assertEqual(self.members(method="google", page_size=1)["total"], 1)

    def test_bad_input_is_422(self):
        for body in ({"sort": "email"}, {"order": "sideways"}, {"plan": "gold"}, {"page": 0}):
            self.assertEqual(self.client.post(BASE + "/members", json=body).status_code, 422, body)


class UnfinishedTest(_ApiCase):
    def test_accounts_without_a_profile(self):
        u = self.get("/unfinished")
        self.assertEqual(u, {"available": True, "accounts": [
            {"created_at": "2026-11-26T10:00:00Z", "confirmed": False, "method": "email", "email": "pending@example.com"},
            {"created_at": "2026-11-23T10:00:00Z", "confirmed": True, "method": "google", "email": "gunf@example.com"},
        ]})
        self.assertEqual([a["email"] for a in self.get("/unfinished", range="90d")["accounts"]],
                         ["pending@example.com", "gunf@example.com", "old@example.com"])
        self.assertEqual(len(self.get("/unfinished", range="all")["accounts"]), 3)


# ---------------------------------------------------------------- access and logging

class AccessTest(_ApiCase):
    def _all_routes(self):
        return [self.client.get(BASE + "/overview"), self.client.post(BASE + "/members", json={}),
                self.client.get(BASE + "/unfinished"), self.client.get(BASE + "/visitors")]

    def test_member_gets_403(self):
        self.as_user(self.m["ruth"])
        self.assertEqual([r.status_code for r in self._all_routes()], [403, 403, 403, 403])

    def test_superuser_gets_200_and_no_store(self):
        for r in self._all_routes():
            self.assertEqual(r.status_code, 200, r.url)
            self.assertEqual(r.headers.get("cache-control"), "no-store", r.url)

    def test_router_requires_a_superuser(self):
        from app.core.deps import get_current_superuser
        self.assertIn(get_current_superuser, [d.dependency for d in api.router.dependencies])

    def test_a_db_error_logs_no_email_or_search_text(self):
        original = analytics_sql.members

        def broken(f, with_auth):
            page, count = original(f, with_auth)
            return page.replace("SELECT u.id,", "SELECT u.no_such_column,", 1), count

        out = io.StringIO()
        handler = logging.StreamHandler(out)
        root = logging.getLogger()
        root.addHandler(handler)
        try:
            with mock.patch.object(analytics_sql, "members", broken), \
                    contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
                r = self.client.post(BASE + "/members", json={"q": "ruth@example.com"})
        finally:
            root.removeHandler(handler)
        self.assertEqual(r.status_code, 500)
        self.assertNotIn("ruth@example.com", r.text)
        self.assertEqual(r.headers.get("cache-control"), "no-store")
        logged = out.getvalue()
        self.assertIn("members failed at query (OperationalError)", logged)
        self.assertNotIn("ruth@example.com", logged)
        self.assertNotIn("no_such_column", logged)


# ---------------------------------------------------------------- PostHog

class _FakeResponse:
    def __init__(self, status=200, results=None):
        self.status_code = status
        self._results = results

    def json(self):
        return {"results": self._results, "columns": []}


def fake_posthog(url, json=None, headers=None, timeout=None):
    q = json["query"]["query"]
    if "GROUP BY b" in q:
        rows = [["2026-11-26 00:00:00", 120, 410], ["2026-11-27 00:00:00", 270, 790]]
    elif "$referring_domain AS domain" in q:
        rows = [["t.co", 210], ["$direct", 90], ["mail.google.com", 4], ["example.org", 1]]
    elif "utm_source AS source" in q:
        rows = [["x", 30]]
    elif "countIf" in q:
        rows = [[44, 7]]
    else:
        rows = [[390, 1200]]
    return _FakeResponse(200, rows)


class VisitorsTest(_ApiCase):
    def setUp(self):
        super().setUp()
        for name, value in (("POSTHOG_PERSONAL_API_KEY", "phx_test_key"), ("POSTHOG_PROJECT_ID", "12345")):
            p = mock.patch.object(settings, name, value)
            p.start()
            self.addCleanup(p.stop)
        poster = mock.patch("app.services.posthog_query.requests.post", side_effect=fake_posthog)
        self.post = poster.start()
        self.addCleanup(poster.stop)

    def test_not_configured_makes_no_call(self):
        with mock.patch.object(settings, "POSTHOG_PERSONAL_API_KEY", ""), \
                mock.patch.object(settings, "POSTHOG_PROJECT_ID", ""):
            v = self.get("/visitors")
        self.assertEqual(v, {"configured": False, "missing": ["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"],
                             "links": {"posthog": "https://us.posthog.com",
                                       "vercel_analytics": "https://vercel.com/jpwilsons-projects/ofs-sept25-frontend/analytics"}})
        self.post.assert_not_called()

    def test_success(self):
        v = self.get("/visitors")
        self.assertEqual((v["configured"], v["ok"], v["interval"], v["cached_at"]), (True, True, "day", "2026-11-27T20:05:12Z"))
        self.assertEqual(len(v["series"]), 7)
        self.assertEqual(v["series"][5], {"t": "2026-11-26T00:00:00-06:00", "partial": False, "visitors": 120, "pageviews": 410})
        self.assertEqual(v["series"][0]["visitors"], 0)
        self.assertTrue(v["series"][6]["partial"])
        self.assertEqual(v["totals"], {"visitors": 390, "pageviews": 1200, "landing_cta": 44, "signed_up": 7})
        self.assertEqual(v["referrers"][:2], [{"domain": "t.co", "label": "X (Twitter)", "visitors": 210},
                                              {"domain": "$direct", "label": "Direct", "visitors": 90}])
        self.assertEqual(v["referrers"][2]["label"], "Gmail")
        self.assertEqual(v["referrers"][3]["label"], "example.org")
        self.assertEqual(v["utm_sources"], [{"source": "x", "visitors": 30}])

    def test_request_filters_and_bound_values(self):
        staff = [f"user_{self.m['owner'].id}", f"user_{self.m['demo'].id}"]  # read before /visitors closes the session
        self.get("/visitors")
        self.assertEqual(self.post.call_count, 5)
        for call in self.post.call_args_list:
            args, kw = call
            self.assertEqual(args[0], "https://us.posthog.com/api/projects/12345/query/")
            self.assertEqual(kw["headers"], {"Authorization": "Bearer phx_test_key"})
            self.assertLessEqual(kw["timeout"], 10)
            body = kw["json"]["query"]
            self.assertEqual(body["kind"], "HogQLQuery")
            q, values = body["query"], body["values"]
            self.assertIn("properties.app = 'ofs'", q)
            self.assertIn("properties.$host IN {hosts}", q)
            self.assertIn("distinct_id IN {staff}", q)
            self.assertEqual(values["hosts"], ["ourfamilysocials.com", "www.ourfamilysocials.com"])
            self.assertEqual(sorted(values["staff"]), sorted(staff))
            self.assertEqual((values["start"], values["end"]), ("2026-11-21 06:00:00", "2026-11-27 20:05:12"))
            for value in staff + ["ourfamilysocials.com", "2026-11-21"]:
                self.assertNotIn(value, q)
        series_body = self.post.call_args_list[0][1]["json"]["query"]
        self.assertIn("toTimeZone(timestamp, 'America/Chicago')", series_body["query"])

    def test_include_staff_drops_the_staff_filter(self):
        self.get("/visitors", include_staff="true")
        for call in self.post.call_args_list:
            body = call[1]["json"]["query"]
            self.assertNotIn("{staff}", body["query"])
            self.assertNotIn("staff", body["values"])

    def test_db_is_closed_before_posthog_is_called(self):
        order = []
        real_close = self.db.close

        def close():
            order.append("close")
            real_close()

        self.db.close = close
        self.post.side_effect = lambda *a, **kw: (order.append("post"), fake_posthog(*a, **kw))[1]
        self.get("/visitors")
        self.assertEqual(order[0], "close")
        self.assertEqual(order.count("post"), 5)

    def test_cache(self):
        self.get("/visitors")
        self.get("/visitors")
        self.assertEqual(self.post.call_count, 5)
        self.get("/visitors", range="30d")
        self.assertEqual(self.post.call_count, 10)

    def test_failures_are_200_with_ok_false(self):
        cases = (
            (requests.Timeout(), "PostHog did not answer (timeout)"),
            (_FakeResponse(401), "401"),
            (_FakeResponse(429), "429"),
            (_FakeResponse(500), "500"),
            (requests.ConnectionError(), "Could not reach PostHog"),
        )
        for outcome, expect in cases:
            api.reset_caches()
            if isinstance(outcome, Exception):
                self.post.side_effect = outcome
            else:
                self.post.side_effect = None
                self.post.return_value = outcome
            r = self.client.get(BASE + "/visitors")
            self.assertEqual(r.status_code, 200)
            body = r.json()
            self.assertEqual(set(body), {"configured", "ok", "error"})
            self.assertEqual((body["configured"], body["ok"]), (True, False))
            self.assertIn(expect, body["error"])
            self.assertNotIn("phx_test_key", r.text)
        calls = self.post.call_count
        self.client.get(BASE + "/visitors")
        self.assertEqual(self.post.call_count, calls + 1)  # failures are not cached

    def test_non_numeric_project_id(self):
        with mock.patch.object(settings, "POSTHOG_PROJECT_ID", "../../evil"):
            v = self.get("/visitors")
        self.assertEqual((v["ok"], v["configured"]), (False, True))
        self.post.assert_not_called()


# ---------------------------------------------------------------- last-login throttle

class LastLoginThrottleTest(unittest.TestCase):
    def setUp(self):
        self.db = plain_session()
        self.user = add_user(self.db, "seen")
        self.db.commit()
        self.writes = 0

        @sa_event.listens_for(self.db.get_bind(), "after_cursor_execute")
        def count(conn, cursor, statement, params, context, executemany):
            if statement.lstrip().upper().startswith("UPDATE USERS") and cursor.rowcount > 0:
                self.writes += 1

    def tearDown(self):
        self.db.close()

    def test_two_calls_within_an_hour_write_once(self):
        _update_last_login(self.user, self.db)
        _update_last_login(self.user, self.db)
        self.assertEqual(self.writes, 1)
        self.assertIsNotNone(self.user.last_login)

    def test_parallel_requests_write_once(self):
        from sqlalchemy.orm import sessionmaker
        other = sessionmaker(bind=self.db.get_bind())()
        stale = other.get(User, self.user.id)  # loaded before either write, like a parallel request
        self.assertIsNone(stale.last_login)
        _update_last_login(self.user, self.db)
        _update_last_login(stale, other)
        other.close()
        self.assertEqual(self.writes, 1)

    def test_writes_again_after_an_hour(self):
        self.user.last_login = datetime.utcnow() - timedelta(hours=2)
        self.db.commit()
        self.writes = 0
        _update_last_login(self.user, self.db)
        self.assertEqual(self.writes, 1)


# ---------------------------------------------------------------- contract

def shape_problems(name, obj, contract, seen):
    problems = []

    def walk(path, value):
        if isinstance(value, dict):
            if path not in contract:
                problems.append(f"{path}: object not in the contract")
                return
            seen.add(path)
            extra, missing = set(value) - set(contract[path]), set(contract[path]) - set(value)
            if extra or missing:
                problems.append(f"{path}: extra {sorted(extra)} missing {sorted(missing)}")
            for k, v in value.items():
                walk(f"{path}.{k}", v)
        elif isinstance(value, list):
            for item in value:
                walk(f"{path}[]", item)

    walk(name, obj)
    return problems


class ContractTest(_ApiCase):
    def test_responses_match_admin_contract(self):
        contract = json.loads(CONTRACT.read_text())
        seen, problems = set(), []
        responses = [
            ("overview", self.get("/overview")),
            ("overview", self.get("/overview", range="all")),
            ("members", self.members()),
            ("unfinished", self.get("/unfinished")),
        ]
        with mock.patch.object(settings, "POSTHOG_PERSONAL_API_KEY", ""):
            responses.append(("visitors_not_configured", self.get("/visitors")))
        with mock.patch.object(settings, "POSTHOG_PERSONAL_API_KEY", "k"), \
                mock.patch.object(settings, "POSTHOG_PROJECT_ID", "1"), \
                mock.patch("app.services.posthog_query.requests.post", side_effect=fake_posthog):
            responses.append(("visitors", self.get("/visitors")))
        with mock.patch.object(settings, "POSTHOG_PERSONAL_API_KEY", "k"), \
                mock.patch.object(settings, "POSTHOG_PROJECT_ID", "1"), \
                mock.patch("app.services.posthog_query.requests.post", side_effect=requests.Timeout()):
            api.reset_caches()
            responses.append(("visitors_failed", self.get("/visitors", range="30d")))
        for name, body in responses:
            problems += shape_problems(name, body, contract, seen)
        self.assertEqual(problems, [])
        self.assertEqual(sorted(set(contract) - seen), [], "contract paths no response exercised")

    def test_auth_missing_keeps_the_shape(self):
        contract = json.loads(CONTRACT.read_text())
        db = make_session(with_auth=False)
        try:
            build_dataset(db, with_auth=False)
            self.app.dependency_overrides[get_db] = lambda: db
            api.reset_caches()
            seen = set()
            problems = shape_problems("overview", self.get("/overview"), contract, seen)
            problems += shape_problems("members", self.members(), contract, seen)
            problems += shape_problems("unfinished", self.get("/unfinished"), contract, seen)
            self.assertEqual(problems, [])
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
