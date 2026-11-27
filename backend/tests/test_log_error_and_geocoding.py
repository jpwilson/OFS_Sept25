"""
POST /feedback/log-error (open to signed-out visitors) caps the report size, flattens
it to single log lines and rate limits each client; the geocoding proxy needs a
signed-in user, throttles each user and caches answers.

    cd backend && .venv/bin/python -m unittest tests.test_log_error_and_geocoding -v
"""
import contextlib
import io
import json
import unittest
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.api import feedback as feedback_api
from app.api import geocoding as geocoding_api


def make_app():
    app = FastAPI()
    app.include_router(feedback_api.router, prefix="/api/v1")
    app.include_router(geocoding_api.router, prefix="/api/v1")
    app.dependency_overrides[get_db] = lambda: None
    return app


class LogErrorTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(make_app())
        feedback_api._error_log_limiter.reset()

    def _post(self, payload, ip="203.0.113.5"):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            r = self.client.post("/api/v1/feedback/log-error", content=json.dumps(payload),
                                 headers={"content-type": "application/json", "x-forwarded-for": ip})
        return r, out.getvalue()

    def test_logs_a_normal_report(self):
        r, logged = self._post({"error_message": "boom", "component_name": "Feed", "page_url": "/feed"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("Message: boom", logged)

    def test_oversized_report_is_refused(self):
        r, logged = self._post({"error_message": "x" * (feedback_api.MAX_ERROR_LOG_BYTES + 10)})
        self.assertEqual(r.status_code, 413)
        self.assertEqual(logged, "")

    def test_report_cannot_forge_log_lines(self):
        r, logged = self._post({"error_message": "a\n[CLIENT ERROR] admin | fake", "error_stack": "s\r\n" * 500,
                                "additional_context": {"k": "v" * 5000}})
        self.assertEqual(r.status_code, 200)
        lines = logged.splitlines()
        self.assertEqual(sum(1 for line in lines if line.startswith("[CLIENT ERROR]")), 1)
        self.assertTrue(all(len(line) < 1100 for line in lines))

    def test_rate_limited_per_client(self):
        for _ in range(10):
            self.assertEqual(self._post({"error_message": "e"})[0].status_code, 200)
        self.assertEqual(self._post({"error_message": "e"})[0].status_code, 429)
        self.assertEqual(self._post({"error_message": "e"}, ip="198.51.100.7")[0].status_code, 200)

    def test_invalid_report(self):
        self.assertEqual(self._post({"nope": 1})[0].status_code, 422)


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class GeocodingTest(unittest.TestCase):
    def setUp(self):
        self.app = make_app()
        self.client = TestClient(self.app)
        geocoding_api._geocode_limiter.reset()
        geocoding_api._cache.clear()
        self.calls = []

        async def fake_get(client, url, params=None, **kw):
            self.calls.append((url, dict(params or {})))
            if url.endswith("/reverse"):
                return FakeResponse({"display_name": "Camden, Maine", "lat": "44.2", "lon": "-69.06", "place_id": 7})
            return FakeResponse([{"display_name": f"{params['q']}, Maine", "lat": "44.2", "lon": "-69.06", "place_id": 7}])

        p = mock.patch("httpx.AsyncClient.get", new=fake_get)
        p.start()
        self.addCleanup(p.stop)

    def sign_in(self, user_id=1):
        self.app.dependency_overrides[get_current_user] = lambda: User(id=user_id, email=f"{user_id}@example.test", username=f"u{user_id}")

    def test_needs_sign_in(self):
        self.assertIn(self.client.get("/api/v1/geocoding/search", params={"query": "Camden"}).status_code, (401, 403))
        self.assertIn(self.client.get("/api/v1/geocoding/reverse", params={"latitude": 44.2, "longitude": -69.06}).status_code, (401, 403))
        self.assertEqual(self.calls, [])

    def test_signed_in_search_and_reverse(self):
        self.sign_in()
        r = self.client.get("/api/v1/geocoding/search", params={"query": "Camden"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["name"], "Camden, Maine")
        r = self.client.get("/api/v1/geocoding/reverse", params={"latitude": 44.2, "longitude": -69.06})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["name"], "Camden, Maine")

    def test_repeated_lookups_are_cached(self):
        self.sign_in()
        for _ in range(5):
            self.client.get("/api/v1/geocoding/search", params={"query": "Camden"})
            self.client.get("/api/v1/geocoding/reverse", params={"latitude": 44.200001, "longitude": -69.06})
        self.assertEqual(len(self.calls), 2)

    def test_throttled_per_user(self):
        self.sign_in(1)
        limit = geocoding_api.GEOCODE_LIMIT_PER_MINUTE
        codes = [self.client.get("/api/v1/geocoding/search", params={"query": f"place {i}"}).status_code for i in range(limit + 1)]
        self.assertEqual(codes[:limit], [200] * limit)
        self.assertEqual(codes[limit], 429)
        self.assertEqual(len(self.calls), limit)
        self.sign_in(2)
        self.assertEqual(self.client.get("/api/v1/geocoding/search", params={"query": "another"}).status_code, 200)


if __name__ == "__main__":
    unittest.main()
