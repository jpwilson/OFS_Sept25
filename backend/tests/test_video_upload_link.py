"""
POST /upload/r2-presign hands out direct-to-R2 upload links. Only members with an
active trial or plan get them, a limited number a day, and each link is signed for
the declared video type and size (at most MAX_VIDEO_SIZE), so it cannot be used as
free file hosting.

    cd backend && .venv/bin/python -m unittest tests.test_video_upload_link -v
"""
import asyncio
import unittest
from datetime import datetime, timedelta
from unittest import mock
from urllib.parse import urlparse, parse_qs

from fastapi import HTTPException

from tests.sqlite_db import make_session
from app.core.config import settings
from app.models.user import User
from app.models.app_setting import AppSetting
from app.api import upload as upload_api
from app.api.upload import PresignRequest

MB = 1024 * 1024
R2 = {
    "R2_ACCESS_KEY_ID": "test-key", "R2_SECRET_ACCESS_KEY": "test-secret", "R2_PUBLIC_DOMAIN": "media.example.test",
    "R2_ENDPOINT": "https://account.r2.example.test", "R2_BUCKET": "ofs-media",
}


class VideoUploadLinkTest(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        for name, value in R2.items():
            p = mock.patch.object(settings, name, value)
            p.start()
            self.addCleanup(p.stop)
        p = mock.patch("app.utils.r2_client._client", None)  # build a client with the test settings
        p.start()
        self.addCleanup(p.stop)
        now = datetime.utcnow()
        self.member = User(email="m@example.test", username="member",
                           trial_start_date=now - timedelta(days=3), trial_end_date=now + timedelta(days=10))
        self.expired = User(email="e@example.test", username="expired", subscription_status="expired",
                            trial_start_date=now - timedelta(days=40), trial_end_date=now - timedelta(days=10))
        self.db.add_all([self.member, self.expired])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _presign(self, user, **body):
        body.setdefault("filename", "video.mp4")
        body.setdefault("content_type", "video/mp4")
        return asyncio.run(upload_api.create_r2_presign(PresignRequest(**body), current_user=user, db=self.db))

    def _status(self, user, **body):
        with self.assertRaises(HTTPException) as cm:
            self._presign(user, **body)
        return cm.exception.status_code

    def test_link_signs_type_and_size(self):
        result = self._presign(self.member, content_length=42 * MB)
        query = parse_qs(urlparse(result["upload_url"]).query)
        signed = query["X-Amz-SignedHeaders"][0].split(";")
        self.assertIn("content-length", signed)
        self.assertIn("content-type", signed)
        self.assertLessEqual(int(query["X-Amz-Expires"][0]), 3600)
        self.assertTrue(result["key"].startswith("videos/") and result["key"].endswith(".mp4"))

    def test_size_is_required_and_capped(self):
        self.assertEqual(self._status(self.member), 400)
        self.assertEqual(self._status(self.member, content_length=0), 400)
        self.assertEqual(self._status(self.member, content_length=settings.MAX_VIDEO_SIZE + 1), 400)
        self._presign(self.member, content_length=settings.MAX_VIDEO_SIZE)

    def test_only_video_types(self):
        for content_type in ("text/html", "video/mp4; charset=x", "image/svg+xml", "video/"):
            self.assertEqual(self._status(self.member, content_type=content_type, content_length=MB), 400, content_type)
        self.assertEqual(self._status(self.member, filename="page.html", content_length=MB), 400)

    def test_needs_an_active_trial_or_plan(self):
        self.assertEqual(self._status(self.expired, content_length=MB), 403)

    def test_daily_cap(self):
        for _ in range(upload_api.VIDEO_LINKS_PER_DAY):
            self._presign(self.member, content_length=MB)
        self.assertEqual(self._status(self.member, content_length=MB), 429)

    def test_cap_resets_the_next_day(self):
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        self.db.add(AppSetting(key=f"video_upload_links:{self.member.id}",
                               value=f"{yesterday}:{upload_api.VIDEO_LINKS_PER_DAY}"))
        self.db.commit()
        self._presign(self.member, content_length=MB)
        row = self.db.query(AppSetting).filter(AppSetting.key == f"video_upload_links:{self.member.id}").one()
        self.assertTrue(row.value.endswith(":1"))


if __name__ == "__main__":
    unittest.main()
