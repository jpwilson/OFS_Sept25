"""
Deleting a media row must never delete a stored file that belongs to someone else, and
the routes that record an already-uploaded file only accept this app's media URLs.

    cd backend && .venv/bin/python -m unittest tests.test_media_delete_guard -v
"""
import asyncio
import unittest
import uuid
from datetime import datetime
from unittest import mock

from fastapi import HTTPException

from tests.sqlite_db import make_session
from app.core.config import settings
from app.models.user import User
from app.models.event import Event
from app.models.event_image import EventImage
from app.api import upload as upload_api
from app.api.upload import EventImageRecordCreate
from app.schemas.event_image import EventImageCreate

DOMAIN = "media.example.test"


def media(key):
    return f"https://{DOMAIN}/{key}"


class MediaDeleteGuardTest(unittest.TestCase):
    def setUp(self):
        self.db = make_session()
        for name, value in {"R2_PUBLIC_DOMAIN": DOMAIN, "SUPABASE_URL": ""}.items():
            p = mock.patch.object(settings, name, value)
            p.start()
            self.addCleanup(p.stop)
        self.deleted = []
        p = mock.patch.object(upload_api, "r2_delete", side_effect=lambda keys: self.deleted.extend(keys))
        p.start()
        self.addCleanup(p.stop)
        p = mock.patch("app.utils.image_cleanup.r2_delete", side_effect=lambda keys: self.deleted.extend(keys))
        p.start()
        self.addCleanup(p.stop)

        self.victim = User(email="v@example.test", username="victim")
        self.attacker = User(email="a@example.test", username="attacker", subscription_tier="premium")
        self.db.add_all([self.victim, self.attacker])
        self.db.flush()
        self.victim_file = f"{uuid.uuid4()}.jpg"
        self.victim_event = Event(title="Victim story", author_id=self.victim.id, start_date=datetime(2026, 1, 1),
                                  description=f'<p>Hi</p><img src="{media("full/" + self.victim_file)}">')
        self.attacker_event = Event(title="Attacker story", author_id=self.attacker.id, start_date=datetime(2026, 1, 2),
                                    description="<p>Mine</p>")
        self.db.add_all([self.victim_event, self.attacker_event])
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _row(self, event, url, **kw):
        row = EventImage(event_id=event.id, image_url=url, **kw)
        self.db.add(row)
        self.db.commit()
        return row

    def _delete(self, row, user):
        return asyncio.run(upload_api.delete_event_image(row.id, current_user=user, db=self.db))

    def assertVictimFileKept(self):
        self.assertFalse([k for k in self.deleted if self.victim_file in k], f"deleted {self.deleted}")

    # ------------------------------------------------------------------ the bypass

    def test_crafted_url_cannot_delete_another_members_file(self):
        # The reference check used to look at the last path segment (an unused name)
        # while the delete used the part after /full/ (the victim's file).
        crafted = media(f"videos/{uuid.uuid4()}.mp4?{media('full/' + self.victim_file)}")
        row = self._row(self.attacker_event, crafted, media_type="video")
        self._delete(row, self.attacker)
        self.assertVictimFileKept()
        self.assertIsNone(self.db.get(EventImage, row.id))

    def test_crafted_thumbnail_cannot_delete_another_members_file(self):
        row = self._row(self.attacker_event, media(f"videos/{uuid.uuid4()}.mp4"), media_type="video",
                        video_thumbnail_url=media(f"full/{uuid.uuid4()}.jpg#/full/{self.victim_file}"))
        self._delete(row, self.attacker)
        self.assertVictimFileKept()

    def test_row_pointing_at_a_used_file_only_drops_the_row(self):
        row = self._row(self.attacker_event, media("full/" + self.victim_file))
        self._delete(row, self.attacker)
        self.assertVictimFileKept()
        self.assertIsNone(self.db.get(EventImage, row.id))

    def test_file_still_in_own_story_text_is_kept(self):
        own = f"{uuid.uuid4()}.jpg"
        self.attacker_event.description += f'<img src="{media("full/" + own)}">'
        self.db.commit()
        row = self._row(self.attacker_event, media("full/" + own))
        self._delete(row, self.attacker)
        self.assertEqual(self.deleted, [])

    def test_file_used_by_another_media_row_or_avatar_is_kept(self):
        own = f"{uuid.uuid4()}.jpg"
        self.victim.avatar_url = media("medium/" + own)
        self.db.commit()
        row = self._row(self.attacker_event, media("full/" + own))
        self._delete(row, self.attacker)
        self.assertEqual(self.deleted, [])

    def test_own_unused_file_is_deleted_in_every_size(self):
        own = f"{uuid.uuid4()}.jpg"
        row = self._row(self.attacker_event, media("full/" + own))
        self._delete(row, self.attacker)
        self.assertEqual(sorted(self.deleted), sorted([f"full/{own}", f"medium/{own}", f"thumbnails/{own}"]))

    def test_own_unused_video_and_thumbnail_are_deleted(self):
        video, thumb = f"{uuid.uuid4()}.mp4", f"{uuid.uuid4()}.jpg"
        row = self._row(self.attacker_event, media("videos/" + video), media_type="video",
                        video_thumbnail_url=media("full/" + thumb))
        self._delete(row, self.attacker)
        self.assertEqual(sorted(self.deleted), sorted([f"videos/{video}", f"full/{thumb}", f"medium/{thumb}", f"thumbnails/{thumb}"]))

    def test_only_the_author_can_delete(self):
        row = self._row(self.victim_event, media("full/" + self.victim_file))
        with self.assertRaises(HTTPException) as cm:
            self._delete(row, self.attacker)
        self.assertEqual(cm.exception.status_code, 403)
        self.assertIsNotNone(self.db.get(EventImage, row.id))

    # ------------------------------------------------------------------ record routes

    def _record(self, url):
        data = EventImageRecordCreate(event_id=self.attacker_event.id, image_url=url)
        return asyncio.run(upload_api.create_event_image_record(data, current_user=self.attacker, db=self.db))

    def _metadata(self, url, **kw):
        data = EventImageCreate(event_id=self.attacker_event.id, image_url=url, **kw)
        return asyncio.run(upload_api.create_event_image_metadata(data, current_user=self.attacker, db=self.db))

    def test_record_routes_refuse_foreign_or_malformed_urls(self):
        bad = [
            "https://evil.example/full/x.jpg",
            media(f"videos/{uuid.uuid4()}.mp4?{media('full/' + self.victim_file)}"),
            media(f"full/{uuid.uuid4()}.jpg#x"),
            media(f"full/{uuid.uuid4()}.jpg/../../videos/x.mp4"),
            media("full/not-a-uuid.jpg"),
            media(f"other/{uuid.uuid4()}.jpg"),
            f"http://{DOMAIN}/full/{uuid.uuid4()}.jpg",
            "javascript:alert(1)",
        ]
        for url in bad:
            for call in (self._record, self._metadata):
                with self.assertRaises(HTTPException, msg=url) as cm:
                    call(url)
                self.assertEqual(cm.exception.status_code, 400, url)

    def test_record_routes_refuse_a_foreign_video_thumbnail(self):
        with self.assertRaises(HTTPException) as cm:
            self._metadata(media(f"videos/{uuid.uuid4()}.mp4"), media_type="video",
                           video_thumbnail_url="https://evil.example/t.jpg")
        self.assertEqual(cm.exception.status_code, 400)

    def test_record_routes_accept_this_apps_media(self):
        good = [
            media(f"full/{uuid.uuid4()}.jpg"),
            media(f"medium/{uuid.uuid4()}.jpg"),
            media(f"cdn-cgi/image/width=1200,quality=82,format=auto/full/{uuid.uuid4()}.jpg"),
        ]
        for url in good:
            self.assertEqual(self._record(url).image_url, url)
            self.assertEqual(self._metadata(url).image_url, url)
        video = media(f"videos/{uuid.uuid4()}.mp4")
        row = self._metadata(video, media_type="video", video_thumbnail_url=media(f"full/{uuid.uuid4()}.jpg"))
        self.assertEqual(row.media_type, "video")

    def test_supabase_fallback_urls(self):
        with mock.patch.object(settings, "SUPABASE_URL", "https://proj.supabase.co"):
            base = "https://proj.supabase.co/storage/v1/object/public"
            self.assertEqual(upload_api.parse_media_url(f"{base}/event-images/full/{uuid.uuid4()}.jpg").kind, "image")
            self.assertEqual(upload_api.parse_media_url(f"{base}/event-videos/k3j4h5-1730000000000.MOV").kind, "video")
            self.assertIsNone(upload_api.parse_media_url(f"{base}/other-bucket/full/{uuid.uuid4()}.jpg"))
            self.assertIsNone(upload_api.parse_media_url(f"{base}/event-images/full/{uuid.uuid4()}.jpg?x=/full/y.jpg"))


if __name__ == "__main__":
    unittest.main()
