"""
POST /events and PUT /events/{id} clean the story HTML before saving it, so a story
written straight to the API cannot carry script or a fake sign-in form.

    cd backend && .venv/bin/python -m unittest tests.test_event_description_cleaned -v
"""
import unittest
from datetime import datetime
from unittest import mock

from fastapi import BackgroundTasks

import importlib.util

if importlib.util.find_spec("nh3") is None:  # pinned in requirements.txt; older venvs lack it
    raise unittest.SkipTest("nh3 is not installed: pip install -r requirements.txt")

from tests.sqlite_db import make_session
from app.models.user import User
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate
from app.api import events as events_api

ATTACK = '<p>Hello</p><img src="x" onerror="alert(1)"><form><input name="password"><button>Sign in</button></form>'
MARKER = ('<span data-location-marker="" data-location-name="Camden" data-latitude="44.2" data-longitude="-69.06" '
          'data-timestamp="2026-08-09T15:05:00" data-place-id="" class="location-marker" contenteditable="false">📍 Camden</span>')


class EventDescriptionCleanedTest(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        self.user = User(email="a@example.test", username="author", subscription_tier="premium")
        self.db.add(self.user)
        self.db.commit()
        # no storage calls from the media sync
        patcher = mock.patch("app.utils.image_cleanup.r2_configured", return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)

    def tearDown(self):
        self.db.close()

    def _create(self, description):
        data = EventCreate(title="Trip", start_date=datetime(2026, 8, 9), description=description)
        return events_api.create_event(data, BackgroundTasks(), is_published=False, current_user=self.user, db=self.db)

    def test_create_cleans_description(self):
        resp = self._create(ATTACK + f"<p>At {MARKER}</p>")
        stored = self.db.get(Event, resp.id).description
        self.assertNotIn("onerror", stored)
        self.assertNotIn("<form", stored)
        self.assertNotIn("<input", stored)
        self.assertIn("<p>Hello</p>", stored)
        self.assertIn('data-location-name="Camden"', stored)
        self.assertEqual(len(resp.locations), 1)

    def test_update_cleans_description(self):
        resp = self._create("<p>Fine</p>")
        events_api.update_event(str(resp.id), EventUpdate(description=ATTACK), current_user=self.user, db=self.db)
        stored = self.db.get(Event, resp.id).description
        self.assertNotIn("onerror", stored)
        self.assertNotIn("<button", stored)
        self.assertIn("<p>Hello</p>", stored)


if __name__ == "__main__":
    unittest.main()
