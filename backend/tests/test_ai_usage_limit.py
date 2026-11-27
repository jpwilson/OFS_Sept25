"""
AI Assist daily limit: a use is counted before the model is called, so parallel
requests cannot both slip under the limit and failed calls still count. Photo count
and text length are capped, and the demo account is refused.

Runs against a temporary SQLite database with the model calls mocked, so no Postgres,
network or API key is needed:
    cd backend && .venv/bin/python -m unittest tests.test_ai_usage_limit -v
"""
import asyncio
import json
import os
import sys
import tempfile
import threading
import unittest
from datetime import datetime, timedelta
from unittest import mock

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker


# Shim: let SQLite create the Postgres-only UUID column on users.
@compiles(UUID, "sqlite")
def _uuid_on_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


from app.core.database import Base, get_db  # noqa: E402
import app.models  # noqa: E402,F401  (registers every table for create_all)
from app.models.user import User  # noqa: E402
from app.models.ai_usage_log import AIUsageLog  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.deps import get_current_user  # noqa: E402
from app.api import ai_creator  # noqa: E402

STORY_JSON = json.dumps({"title": "T", "story_html": "<p>x</p>", "captions": [], "category": "Vacation"})


def photos(n):
    return [ai_creator.PhotoData(image_url=f"https://media.example.test/{i}.jpg") for i in range(n)]


class AIUsageLimitTest(unittest.TestCase):
    def setUp(self):
        # A file database so each "request" gets its own connection, as in production
        fd, self.path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        self.engine = create_engine(f"sqlite:///{self.path}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

        db = self.Session()
        user = User(email="writer@example.test", username="writer",
                    subscription_tier="premium", subscription_status="active")
        db.add(user)
        db.commit()
        self.user_id = user.id
        db.close()

        for p in [
            mock.patch.object(settings, "ANTHROPIC_API_KEY", "test-key"),
            mock.patch.object(settings, "OPENAI_API_KEY", "test-key"),
        ]:
            p.start()
            self.addCleanup(p.stop)

    def tearDown(self):
        self.engine.dispose()
        os.remove(self.path)

    # --- helpers ---

    def add_uses(self, n):
        db = self.Session()
        for _ in range(n):
            db.add(AIUsageLog(user_id=self.user_id, action_type="generate_story", created_at=datetime.utcnow()))
        db.commit()
        db.close()

    def uses_today(self):
        db = self.Session()
        try:
            return db.query(AIUsageLog).filter(AIUsageLog.user_id == self.user_id).count()
        finally:
            db.close()

    def generate(self, n_photos=1, text=""):
        """Run one generate-story request on its own session; returns the HTTP status."""
        db = self.Session()
        try:
            user = db.get(User, self.user_id)
            request = ai_creator.GenerateStoryRequest(photos=photos(n_photos), user_text=text)
            asyncio.run(ai_creator.generate_story(request, current_user=user, db=db))
            return 200
        except HTTPException as e:
            return e.status_code
        finally:
            db.close()

    # --- tests ---

    def test_two_requests_at_once_cannot_both_pass_the_limit(self):
        self.add_uses(4)  # one use left today
        first_in_model = threading.Event()
        release_first = threading.Event()
        model_calls = []

        def slow_model(*args, **kwargs):
            model_calls.append(1)
            if len(model_calls) == 1:
                first_in_model.set()
                release_first.wait(5)
            return STORY_JSON

        results = {}
        with mock.patch.object(ai_creator, "call_ai_model", side_effect=slow_model):
            first = threading.Thread(target=lambda: results.setdefault("first", self.generate()))
            first.start()
            self.assertTrue(first_in_model.wait(5), "first request never reached the model")
            results["second"] = self.generate()  # arrives while the first is still waiting on the model
            release_first.set()
            first.join(5)

        self.assertEqual(results["first"], 200)
        self.assertEqual(results["second"], 429)
        self.assertEqual(len(model_calls), 1)
        self.assertEqual(self.uses_today(), 5)

    def test_failed_model_call_still_counts(self):
        with mock.patch.object(ai_creator, "call_ai_model", side_effect=RuntimeError("upstream down")):
            self.assertEqual(self.generate(), 500)
        self.assertEqual(self.uses_today(), 1)

    def test_limit_refuses_without_calling_the_model(self):
        self.add_uses(5)
        with mock.patch.object(ai_creator, "call_ai_model", return_value=STORY_JSON) as model:
            self.assertEqual(self.generate(), 429)
        model.assert_not_called()
        self.assertEqual(self.uses_today(), 5)

    def test_missing_api_key_is_refused_before_counting(self):
        with mock.patch.object(settings, "ANTHROPIC_API_KEY", ""), \
             mock.patch.object(ai_creator, "call_ai_model", return_value=STORY_JSON) as model:
            self.assertEqual(self.generate(), 500)
        model.assert_not_called()
        self.assertEqual(self.uses_today(), 0)

    def test_images_sent_to_the_model_are_capped(self):
        with mock.patch.object(ai_creator, "call_ai_model", return_value=STORY_JSON) as model:
            self.assertEqual(self.generate(n_photos=ai_creator.MAX_IMAGES_TO_MODEL + 20), 200)
        content = model.call_args[0][3]
        images = [b for b in content if b["type"] == "image"]
        self.assertEqual(len(images), ai_creator.MAX_IMAGES_TO_MODEL)

    def test_request_size_limits(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            ai_creator.GenerateStoryRequest(photos=photos(ai_creator.MAX_PHOTOS_PER_REQUEST + 1))
        with self.assertRaises(ValidationError):
            ai_creator.GenerateQuestionsRequest(photos=photos(ai_creator.MAX_PHOTOS_PER_REQUEST + 1))
        with self.assertRaises(ValidationError):
            ai_creator.GenerateStoryRequest(photos=photos(1), user_text="x" * (ai_creator.MAX_REQUEST_TEXT + 1))
        with self.assertRaises(ValidationError):
            ai_creator.GenerateStoryRequest(
                photos=photos(1),
                interview_answers=[{"question": "q", "answer": "a"}] * (ai_creator.MAX_INTERVIEW_ANSWERS + 1),
            )

    def test_failed_transcription_still_counts(self):
        from io import BytesIO
        from starlette.datastructures import UploadFile

        client = mock.Mock()
        client.audio.transcriptions.create.side_effect = RuntimeError("upstream down")
        db = self.Session()
        try:
            user = db.get(User, self.user_id)
            upload = UploadFile(file=BytesIO(b"audio"), filename="note.webm")
            fake_openai = mock.Mock(OpenAI=mock.Mock(return_value=client))
            with mock.patch.dict(sys.modules, {"openai": fake_openai}):
                with self.assertRaises(HTTPException) as ctx:
                    asyncio.run(ai_creator.transcribe_audio(file=upload, current_user=user, db=db))
            self.assertEqual(ctx.exception.status_code, 500)
            self.assertNotIn("upstream down", ctx.exception.detail)
        finally:
            db.close()
        self.assertEqual(self.uses_today(), 1)

    def test_ai_routes_refuse_demo_account(self):
        db = self.Session()
        demo = User(email="demo@example.test", username="demo", is_demo_account=True,
                    subscription_tier="family", subscription_status="active")
        db.add(demo)
        db.commit()

        app = FastAPI()
        app.include_router(ai_creator.router)

        def _db():
            s = self.Session()
            try:
                yield s
            finally:
                s.close()

        app.dependency_overrides[get_db] = _db
        app.dependency_overrides[get_current_user] = lambda: demo
        client = TestClient(app)
        body = {"photos": [{"image_url": "https://media.example.test/1.jpg"}], "user_text": "hi"}
        with mock.patch.object(ai_creator, "call_ai_model", return_value=STORY_JSON) as model:
            for path in ("/admin/ai/generate-story", "/admin/ai/generate-questions"):
                self.assertEqual(client.post(path, json=body).status_code, 403, path)
            self.assertEqual(client.post("/admin/ai/transcribe",
                                         files={"file": ("a.webm", b"x", "audio/webm")}).status_code, 403)
            self.assertEqual(client.post("/admin/ai/cluster-photos", json={"photos": []}).status_code, 403)
        model.assert_not_called()
        db.close()


if __name__ == "__main__":
    unittest.main()
