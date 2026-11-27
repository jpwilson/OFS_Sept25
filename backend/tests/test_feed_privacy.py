"""
The feed (GET /events) lists only stories the viewer may open, and demo
accounts see only showcase and public stories.

    cd backend && .venv/bin/python -m unittest tests.test_feed_privacy -v
"""
import unittest
from datetime import datetime, timedelta

from helpers import make_session, add_user, add_follow, add_event

from app.models.custom_group import CustomGroup, CustomGroupMember
from app.models.event import Event
from app.models.user_mute import UserMute
from app.api.events import get_events
from app.utils.privacy import can_view_event


class MemberFeedTest(unittest.TestCase):
    def setUp(self):
        db = self.db = make_session()
        # ids 1-3 are the seed authors the feed always leaves out
        for i in range(3):
            add_user(db, f"seed{i}")
        self.viewer = add_user(db, "viewer")
        self.followed = add_user(db, "followed")
        self.stranger = add_user(db, "stranger")
        self.muted = add_user(db, "muted")
        self.lapsed = add_user(db, "lapsed", subscription_tier="free", subscription_status="expired")
        add_follow(db, self.viewer, self.followed)  # not close family
        group = CustomGroup(owner_id=self.stranger.id, name="Other group")
        mine = CustomGroup(owner_id=self.followed.id, name="My group")
        db.add_all([group, mine])
        db.flush()
        db.add(CustomGroupMember(group_id=mine.id, user_id=self.viewer.id))
        db.add(UserMute(muter_id=self.viewer.id, muted_user_id=self.muted.id))

        add_event(db, self.viewer, "My private", "private")
        add_event(db, self.followed, "Followed public", "public")
        add_event(db, self.followed, "Followed followers", "followers")
        add_event(db, self.followed, "Followed close family", "close_family")
        add_event(db, self.followed, "Followed my group", "custom_group", custom_group_id=mine.id)
        add_event(db, self.stranger, "Stranger public", "public")
        add_event(db, self.stranger, "Stranger followers", "followers")
        add_event(db, self.stranger, "Stranger close family", "close_family")
        add_event(db, self.stranger, "Stranger group", "custom_group", custom_group_id=group.id)
        add_event(db, self.stranger, "Stranger private", "private")
        add_event(db, self.stranger, "Stranger draft", "public", is_published=False)
        add_event(db, self.muted, "Muted public", "public")
        add_event(db, self.lapsed, "Lapsed public", "public")
        db.commit()

    def tearDown(self):
        self.db.close()

    def _feed(self, viewer):
        return sorted(e.title for e in get_events(limit=100, db=self.db, current_user=viewer))

    def test_member_sees_only_stories_they_may_open(self):
        self.assertEqual(self._feed(self.viewer), [
            "Followed followers",
            "Followed my group",
            "Followed public",
            "My private",
            "Stranger public",
        ])

    def test_every_feed_story_opens(self):
        for item in get_events(limit=100, db=self.db, current_user=self.viewer):
            self.assertTrue(can_view_event(self.db.get(Event, item.id), self.viewer, self.db), item.title)

    def test_anonymous_sees_public_only(self):
        self.assertEqual(self._feed(None), ["Followed public", "Muted public", "Stranger public"])

    def test_limit_is_capped(self):
        for i in range(105):
            add_event(self.db, self.stranger, f"Bulk {i}", "public")
        self.db.commit()
        self.assertEqual(len(get_events(limit=1000, db=self.db, current_user=None)), 100)


class DemoFeedTest(unittest.TestCase):
    def setUp(self):
        db = self.db = make_session()
        self.seed = add_user(db, "seed")
        self.demo = add_user(db, "demo", is_demo_account=True)
        self.member = add_user(db, "member")
        add_event(db, self.seed, "Showcase close family", "close_family", is_demo_showcase=True,
                  start_date=datetime(2020, 1, 1))
        add_event(db, self.seed, "Showcase private", "private", is_demo_showcase=True,
                  start_date=datetime(2020, 1, 2))
        add_event(db, self.member, "Member public", "public", start_date=datetime(2026, 1, 1))
        add_event(db, self.member, "Member followers", "followers", start_date=datetime(2026, 1, 2))
        add_event(db, self.member, "Member close family", "close_family", start_date=datetime(2026, 1, 3))
        db.commit()

    def tearDown(self):
        self.db.close()

    def test_demo_feed_is_showcase_then_public(self):
        titles = [e.title for e in get_events(limit=100, db=self.db, current_user=self.demo)]
        self.assertEqual(titles[:2], ["Showcase private", "Showcase close family"])
        self.assertEqual(sorted(titles[2:]), ["Member public"])

    def test_demo_detail_matches_feed(self):
        allowed = {
            e.title: can_view_event(e, self.demo, self.db)
            for e in self.db.query(Event).all()
        }
        self.assertEqual(allowed, {
            "Showcase close family": True,
            "Showcase private": True,
            "Member public": True,
            "Member followers": False,
            "Member close family": False,
        })


if __name__ == "__main__":
    unittest.main()
