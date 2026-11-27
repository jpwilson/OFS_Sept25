"""
Who may see and touch a story: new-story emails, lists, story detail, and
comments, likes and reactions on stories and their photos.

    cd backend && .venv/bin/python -m unittest tests.test_story_privacy -v
"""
import unittest
from datetime import datetime

from fastapi import BackgroundTasks, HTTPException

from helpers import make_session, add_user, add_follow, add_event

from app.models.custom_group import CustomGroup, CustomGroupMember
from app.models.event_tag import EventTag
from app.models.event_image import EventImage
from app.models.comment import Comment
from app.models.media_comment import MediaComment
from app.schemas.event import EventCreate
from app.api import events as events_api
from app.api import comments as comments_api
from app.api import likes as likes_api
from app.api import media_engagement as media_api
from app.api.users import get_user_events


class NewStoryEmailAudienceTest(unittest.TestCase):
    """Item 1: emails go only to people who may open the story."""

    def setUp(self):
        db = self.db = make_session()
        self.author = add_user(db, "author")
        self.plain = add_user(db, "plain")
        self.close = add_user(db, "close")
        self.grouped = add_user(db, "grouped")
        self.opted_out = add_user(db, "optedout", notify_new_event_from_followed=False)
        self.author_muted = add_user(db, "authormuted")
        add_follow(db, self.plain, self.author)
        add_follow(db, self.close, self.author, is_close_family=True)
        add_follow(db, self.grouped, self.author)
        add_follow(db, self.opted_out, self.author)
        add_follow(db, self.author_muted, self.author, notify_new_events=False)
        self.group = CustomGroup(owner_id=self.author.id, name="Cousins")
        db.add(self.group)
        db.flush()
        db.add(CustomGroupMember(group_id=self.group.id, user_id=self.grouped.id))
        db.commit()

    def tearDown(self):
        self.db.close()

    def _emailed(self, privacy_level, **kw):
        tasks = BackgroundTasks()
        events_api.create_event(
            event_data=EventCreate(
                title=f"A {privacy_level} story",
                start_date=datetime(2026, 5, 1),
                privacy_level=privacy_level,
                **kw,
            ),
            background_tasks=tasks,
            is_published=True,
            current_user=self.author,
            db=self.db,
        )
        return sorted(t.kwargs["to_email"].split("@")[0] for t in tasks.tasks)

    def test_private_story_emails_nobody(self):
        self.assertEqual(self._emailed("private"), [])

    def test_close_family_story_emails_close_family_only(self):
        self.assertEqual(self._emailed("close_family"), ["close"])

    def test_custom_group_story_emails_group_members_only(self):
        self.assertEqual(self._emailed("custom_group", custom_group_id=self.group.id), ["grouped"])

    def test_followers_story_emails_followers_who_want_it(self):
        self.assertEqual(self._emailed("followers"), ["close", "grouped", "plain"])

    def test_draft_emails_nobody(self):
        tasks = BackgroundTasks()
        events_api.create_event(
            event_data=EventCreate(title="Draft", start_date=datetime(2026, 5, 1)),
            background_tasks=tasks, is_published=False, current_user=self.author, db=self.db,
        )
        self.assertEqual(tasks.tasks, [])


class ListMatchesDetailTest(unittest.TestCase):
    """Item 3: a list never returns a story the detail view would refuse."""

    def setUp(self):
        db = self.db = make_session()
        self.author = add_user(db, "author")
        self.tagged = add_user(db, "tagged")
        self.viewer = add_user(db, "viewer")  # follows the tagged person, not the author
        add_follow(db, self.viewer, self.tagged)
        group = CustomGroup(owner_id=self.author.id, name="Inner circle")
        db.add(group)
        db.flush()
        for title, level in [
            ("Public", "public"),
            ("Followers", "followers"),
            ("Close family", "close_family"),
            ("Group", "custom_group"),
            ("Private", "private"),
        ]:
            event = add_event(db, self.author, title, level,
                              custom_group_id=group.id if level == "custom_group" else None)
            db.add(EventTag(event_id=event.id, tagged_user_id=self.tagged.id,
                            tagged_by_id=self.author.id, status="accepted"))
        db.commit()

    def tearDown(self):
        self.db.close()

    def test_tagged_follow_does_not_reveal_hidden_stories(self):
        listed = sorted(e.title for e in get_user_events("author", db=self.db, current_user=self.viewer))
        self.assertEqual(listed, ["Public"])

    def test_every_listed_story_opens(self):
        from app.utils.privacy import can_view_event
        from app.models.event import Event
        for item in get_user_events("author", db=self.db, current_user=self.viewer):
            event = self.db.get(Event, item.id)
            self.assertTrue(can_view_event(event, self.viewer, self.db), item.title)


class DraftAndTrashDetailTest(unittest.TestCase):
    """Item 4: only the author may open a draft or a trashed story."""

    def setUp(self):
        db = self.db = make_session()
        self.author = add_user(db, "author")
        self.follower = add_user(db, "follower")
        add_follow(db, self.follower, self.author)
        self.draft = add_event(db, self.author, "Draft", "followers", is_published=False)
        self.trashed = add_event(db, self.author, "Trashed", "public", is_deleted=True)
        db.commit()

    def tearDown(self):
        self.db.close()

    def _status(self, event, viewer):
        try:
            events_api.get_event(str(event.id), db=self.db, current_user=viewer)
            return 200
        except HTTPException as e:
            return e.status_code

    def test_follower_cannot_open_draft(self):
        self.assertEqual(self._status(self.draft, self.follower), 404)

    def test_anyone_cannot_open_trashed_story(self):
        self.assertEqual(self._status(self.trashed, self.follower), 404)
        self.assertEqual(self._status(self.trashed, None), 404)

    def test_author_still_opens_both(self):
        self.assertEqual(self._status(self.draft, self.author), 200)
        self.assertEqual(self._status(self.trashed, self.author), 200)


class EngagementNeedsViewAccessTest(unittest.TestCase):
    """Item 5: no comments, likes or reactions on stories or photos you may not open."""

    def setUp(self):
        db = self.db = make_session()
        self.author = add_user(db, "author")
        self.stranger = add_user(db, "stranger")
        self.follower = add_user(db, "follower")
        add_follow(db, self.follower, self.author)
        self.event = add_event(db, self.author, "Followers only", "followers")
        self.media = EventImage(event_id=self.event.id, image_url="https://x.test/full/a.jpg")
        db.add(self.media)
        db.flush()
        self.comment = Comment(event_id=self.event.id, author_id=self.author.id, content="hi")
        self.media_comment = MediaComment(event_image_id=self.media.id, author_id=self.author.id, content="hi")
        db.add_all([self.comment, self.media_comment])
        db.commit()

    def tearDown(self):
        self.db.close()

    def _refused(self, fn, *args, **kw):
        with self.assertRaises(HTTPException) as ctx:
            fn(*args, db=self.db, current_user=self.stranger, **kw)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_stranger_cannot_comment_or_react_on_story(self):
        self._refused(comments_api.create_comment, self.event.id,
                      comments_api.CommentCreate(content="hello"), BackgroundTasks())
        self._refused(comments_api.react_to_comment, self.event.id, self.comment.id,
                      comments_api.ReactionCreate(reaction_type="heart"))

    def test_stranger_cannot_like_story(self):
        self._refused(likes_api.like_event, self.event.id)
        self._refused(events_api.add_like, self.event.id)

    def test_stranger_cannot_like_comment_or_react_on_photo(self):
        self._refused(media_api.like_media, self.media.id, media_api.MediaLikeCreate())
        self._refused(media_api.create_media_comment, self.media.id,
                      media_api.MediaCommentCreate(content="hello"))
        self._refused(media_api.react_to_media_comment, self.media.id, self.media_comment.id,
                      media_api.MediaCommentReactionCreate(reaction_type="heart"))

    def test_follower_still_can(self):
        comments_api.create_comment(self.event.id, comments_api.CommentCreate(content="hello"),
                                    BackgroundTasks(), current_user=self.follower, db=self.db)
        likes_api.like_event(self.event.id, current_user=self.follower, db=self.db)
        media_api.like_media(self.media.id, media_api.MediaLikeCreate(),
                             current_user=self.follower, db=self.db)


class MediaReadsNeedViewAccessTest(unittest.TestCase):
    """Item 2: photo comments, likes and stats only for people who may open the story."""

    def setUp(self):
        db = self.db = make_session()
        self.author = add_user(db, "author")
        self.follower = add_user(db, "follower")
        add_follow(db, self.follower, self.author)
        self.hidden = add_event(db, self.author, "Followers only", "followers",
                                share_enabled=True, share_token="good-token")
        self.public = add_event(db, self.author, "Public", "public")
        self.hidden_media = EventImage(event_id=self.hidden.id, image_url="https://x.test/full/h.jpg")
        self.public_media = EventImage(event_id=self.public.id, image_url="https://x.test/full/p.jpg")
        db.add_all([self.hidden_media, self.public_media])
        db.flush()
        db.add(MediaComment(event_image_id=self.hidden_media.id, author_id=self.author.id, content="secret"))
        db.commit()

    def tearDown(self):
        self.db.close()

    def test_anonymous_cannot_read_hidden_photo_comments_or_likes(self):
        for fn in (media_api.get_media_comments, media_api.get_media_likes):
            with self.assertRaises(HTTPException) as ctx:
                fn(self.hidden_media.id, share_token=None, current_user=None, db=self.db)
            self.assertEqual(ctx.exception.status_code, 404)

    def test_batch_routes_leave_out_hidden_photos(self):
        ids = f"{self.hidden_media.id},{self.public_media.id}"
        for fn in (media_api.get_batch_media_stats, media_api.get_batch_media_likes):
            rows = fn(ids=ids, share_token=None, current_user=None, db=self.db)
            self.assertEqual([r.media_id for r in rows], [self.public_media.id])

    def test_follower_reads_them(self):
        comments = media_api.get_media_comments(self.hidden_media.id, share_token=None,
                                                current_user=self.follower, db=self.db)
        self.assertEqual([c.content for c in comments], ["secret"])
        rows = media_api.get_batch_media_stats(ids=str(self.hidden_media.id), share_token=None,
                                               current_user=self.follower, db=self.db)
        self.assertEqual(len(rows), 1)

    def test_share_link_reads_them_and_bad_token_does_not(self):
        comments = media_api.get_media_comments(self.hidden_media.id, share_token="good-token",
                                                current_user=None, db=self.db)
        self.assertEqual(len(comments), 1)
        rows = media_api.get_batch_media_stats(ids=str(self.hidden_media.id), share_token="good-token",
                                               current_user=None, db=self.db)
        self.assertEqual(len(rows), 1)
        rows = media_api.get_batch_media_stats(ids=str(self.hidden_media.id), share_token="bad-token",
                                               current_user=None, db=self.db)
        self.assertEqual(rows, [])


if __name__ == "__main__":
    unittest.main()
