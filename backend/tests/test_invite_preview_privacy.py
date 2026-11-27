"""
The public invitation preview (GET /api/v1/auth/validate-invite/{token}) may only
show an inviter's published, not-deleted Public and Followers stories.

Runs against an in-memory SQLite database, so no Postgres or network is needed:
    cd backend && .venv/bin/python -m unittest tests.test_invite_preview_privacy -v
"""
import unittest
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


# Shim: let SQLite create the Postgres-only UUID column on users.
@compiles(UUID, "sqlite")
def _uuid_on_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


from app.core.database import Base  # noqa: E402
import app.models  # noqa: E402,F401  (registers every table for create_all)
from app.models.user import User  # noqa: E402
from app.models.event import Event  # noqa: E402
from app.models.invited_viewer import InvitedViewer  # noqa: E402
from app.api.auth import validate_invite_token  # noqa: E402


class InvitePreviewPrivacyTest(unittest.TestCase):
    def setUp(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

        inviter = User(email="inviter@example.test", username="inviter")
        self.db.add(inviter)
        self.db.flush()

        base = datetime(2026, 1, 1)
        stories = [
            ("Public story", "public", True, False),
            ("Followers story", "followers", True, False),
            ("Close family story", "close_family", True, False),
            ("Custom group story", "custom_group", True, False),
            ("Private story", "private", True, False),
            ("Draft public story", "public", False, False),
            ("Trashed public story", "public", True, True),
        ]
        # Hidden stories get the newest dates so the old query (latest 3) would pick them.
        for i, (title, level, published, deleted) in enumerate(stories):
            self.db.add(Event(
                title=title,
                author_id=inviter.id,
                start_date=base + timedelta(days=i),
                privacy_level=level,
                is_published=published,
                is_deleted=deleted,
            ))

        self.db.add(InvitedViewer(inviter_id=inviter.id, invite_token="test-token"))
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_preview_shows_only_public_and_followers_stories(self):
        response = validate_invite_token("test-token", db=self.db)

        self.assertTrue(response.valid)
        titles = sorted(e.title for e in response.recent_events)
        self.assertEqual(titles, ["Followers story", "Public story"])


if __name__ == "__main__":
    unittest.main()
