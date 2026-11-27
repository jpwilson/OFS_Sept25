"""
Tag profiles, invitations, sign-up, user search and follow-request emails.

    cd backend && .venv/bin/python -m unittest tests.test_member_privacy -v
"""
import unittest
import uuid
from datetime import date, datetime, timedelta
from unittest import mock

from fastapi import BackgroundTasks, HTTPException
from fastapi.testclient import TestClient

from helpers import make_session, add_user, add_follow

from app.core.database import get_db
from app.models.follow import Follow
from app.models.invited_viewer import InvitedViewer
from app.models.tag_profile import TagProfile
from app.models.tag_profile_relationship import TagProfileRelationship
from app.models.tag_profile_relationship_request import TagProfileRelationshipRequest
from app.schemas.tag_profile import TagProfileRelationshipCreate, TagProfileRelationshipRequestCreate
from app.api import tag_profiles as tag_api
from app.api import invitations as inv_api
from app.api import users as users_api
from app.api import auth as auth_api


def anonymous_client(db):
    """A TestClient (no sign-in header) whose requests use the given session."""
    from app.main import app
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app), app


class TagProfileRequestApprovalTest(unittest.TestCase):
    """Item 6: only the other party may approve or reject a link request."""

    def setUp(self):
        db = self.db = make_session()
        self.creator = add_user(db, "creator")
        self.member = add_user(db, "member")
        self.target = add_user(db, "target")
        self.profile = TagProfile(name="Kim", created_by_id=self.creator.id, birth_date=date(2019, 4, 2))
        db.add(self.profile)
        db.commit()

    def tearDown(self):
        self.db.close()

    def _member_request(self):
        sent = tag_api.request_relationship(
            self.profile.id, TagProfileRelationshipRequestCreate(relationship_type="aunt"),
            current_user=self.member, db=self.db)
        return sent.id

    def _creator_proposal(self):
        tag_api.add_relationship(
            self.profile.id, TagProfileRelationshipCreate(user_id=self.target.id, relationship_type="uncle"),
            current_user=self.creator, db=self.db)
        return self.db.query(TagProfileRelationshipRequest).filter_by(proposer_id=self.target.id).one().id

    def _status(self, fn, request_id, user):
        try:
            fn(request_id, current_user=user, db=self.db)
            return 200
        except HTTPException as e:
            return e.status_code

    def test_member_cannot_approve_or_reject_own_request(self):
        rid = self._member_request()
        self.assertEqual(self._status(tag_api.approve_relationship_request, rid, self.member), 403)
        self.assertEqual(self._status(tag_api.reject_relationship_request, rid, self.member), 403)
        self.assertEqual(self.db.query(TagProfileRelationship).count(), 0)
        self.assertEqual(self._status(tag_api.approve_relationship_request, rid, self.creator), 200)

    def test_creator_cannot_approve_own_proposal(self):
        rid = self._creator_proposal()
        self.assertEqual(self._status(tag_api.approve_relationship_request, rid, self.creator), 403)
        self.assertEqual(self._status(tag_api.approve_relationship_request, rid, self.target), 200)

    def test_inbox_lists_only_requests_i_resolve(self):
        self._member_request()
        self._creator_proposal()
        self.assertEqual(len(tag_api.get_relationship_requests_to_me(current_user=self.member, db=self.db)), 0)
        self.assertEqual(len(tag_api.get_relationship_requests_to_me(current_user=self.creator, db=self.db)), 1)
        self.assertEqual(len(tag_api.get_relationship_requests_to_me(current_user=self.target, db=self.db)), 1)
        self.assertEqual(tag_api.get_relationship_requests_count(current_user=self.creator, db=self.db), {"count": 1})

    def test_member_cannot_forge_a_creator_proposal(self):
        with self.assertRaises(HTTPException) as ctx:
            tag_api.request_relationship(
                self.profile.id,
                TagProfileRelationshipRequestCreate(relationship_type="aunt", message="Proposed by Creator"),
                current_user=self.member, db=self.db)
        self.assertEqual(ctx.exception.status_code, 400)


class TagProfileReadTest(unittest.TestCase):
    """Item 6: tag profiles need sign-in; birth date only for creator and linked users."""

    def setUp(self):
        db = self.db = make_session()
        self.creator = add_user(db, "creator")
        self.linked = add_user(db, "linked")
        self.other = add_user(db, "other")
        self.profile = TagProfile(name="Kim", created_by_id=self.creator.id, birth_date=date(2019, 4, 2))
        db.add(self.profile)
        db.flush()
        db.add(TagProfileRelationship(tag_profile_id=self.profile.id, user_id=self.linked.id,
                                      relationship_type="aunt"))
        db.commit()

    def tearDown(self):
        self.db.close()

    def test_anonymous_gets_nothing(self):
        client, app = anonymous_client(self.db)
        try:
            for path in (f"/api/v1/tag-profiles/{self.profile.id}",
                         f"/api/v1/tag-profiles/{self.profile.id}/relationships"):
                self.assertIn(client.get(path).status_code, (401, 403), path)
        finally:
            app.dependency_overrides.clear()

    def test_birth_date_only_for_creator_and_linked(self):
        def birth_date(user):
            return tag_api.get_tag_profile(self.profile.id, current_user=user, db=self.db).birth_date
        self.assertEqual(birth_date(self.creator), date(2019, 4, 2))
        self.assertEqual(birth_date(self.linked), date(2019, 4, 2))
        self.assertIsNone(birth_date(self.other))


class InvitationTest(unittest.TestCase):
    """Item 7: invitations do not leak members and cannot be used as a relay."""

    def setUp(self):
        db = self.db = make_session()
        self.me = add_user(db, "me")
        self.someone = add_user(db, "someone")
        self.existing = add_user(db, "existing")
        db.add(InvitedViewer(inviter_id=self.someone.id, invited_email="friend@example.com",
                             invite_token="someone-token", status="pending"))
        db.commit()

    def tearDown(self):
        self.db.close()

    def _create(self, email="new@example.com", **kw):
        return inv_api.create_invitation(inv_api.InvitationCreate(email=email, **kw), BackgroundTasks(),
                                         current_user=self.me, db=self.db)

    def _error(self, **kw):
        with self.assertRaises(HTTPException) as ctx:
            self._create(**kw)
        return ctx.exception

    def test_user_exists_error_has_no_username(self):
        err = self._error(email="existing@example.com")
        self.assertEqual(err.detail["code"], "USER_EXISTS")
        self.assertNotIn("username", err.detail)

    def test_check_email_reveals_only_my_own_invitation(self):
        res = inv_api.check_email("existing@example.com", current_user=self.me, db=self.db)
        self.assertFalse(res.exists_as_user)
        self.assertIsNone(res.existing_user_username)
        res = inv_api.check_email("friend@example.com", current_user=self.me, db=self.db)
        self.assertEqual(res.invited_by_others, [])
        self.assertFalse(res.already_invited_by_me)

    def test_daily_cap(self):
        for i in range(inv_api.MAX_INVITATION_EMAILS_PER_DAY):
            self._create(email=f"n{i}@example.com")
        self.assertEqual(self._error(email="one-more@example.com").status_code, 429)

    def test_old_invitations_do_not_count_towards_cap(self):
        long_ago = datetime.utcnow() - timedelta(days=3)
        for i in range(inv_api.MAX_INVITATION_EMAILS_PER_DAY):
            self.db.add(InvitedViewer(inviter_id=self.me.id, invited_email=f"o{i}@example.com",
                                      invite_token=f"old-{i}", created_at=long_ago, last_sent_at=long_ago))
        self.db.commit()
        self._create()

    def test_links_and_long_messages_refused(self):
        for message in ("Join me at http://evil.test/x", "see www.evil.test", "go to cheap-pills.com now"):
            self.assertEqual(self._error(personal_message=message).status_code, 400, message)
        self.assertEqual(self._error(name="Visit evil.com").status_code, 400)
        self.assertEqual(self._error(personal_message="x" * 501).status_code, 400)
        self._create(personal_message="Hi Gran, come and see the kids' photos! Love, me.")


class SignupInvitationTest(unittest.TestCase):
    """Item 7: sign-up connects only the inviter whose link was redeemed."""

    def setUp(self):
        db = self.db = make_session()
        self.redeemed_inviter = add_user(db, "redeemed")
        self.other_inviter = add_user(db, "other")
        db.add(InvitedViewer(inviter_id=self.redeemed_inviter.id, invited_email="new@example.com",
                             invite_token="redeemed-token", status="pending"))
        self.other_invite = InvitedViewer(inviter_id=self.other_inviter.id, invited_email="new@example.com",
                                          invite_token="other-token", status="pending")
        db.add(self.other_invite)
        db.commit()

    def tearDown(self):
        self.db.close()

    def test_only_redeemed_inviter_is_connected(self):
        payload = {"sub": str(uuid.uuid4()), "email": "new@example.com"}
        with mock.patch.object(auth_api, "validate_supabase_token", return_value=payload):
            auth_api.create_supabase_profile(
                auth_api.SupabaseProfileCreate(username="newbie", supabase_token="t",
                                               invite_token="redeemed-token"),
                BackgroundTasks(), db=self.db)

        pairs = {(f.follower.username, f.following.username, f.status) for f in self.db.query(Follow).all()}
        self.assertEqual(pairs, {("newbie", "redeemed", "accepted"), ("redeemed", "newbie", "accepted")})
        self.db.refresh(self.other_invite)
        self.assertEqual(self.other_invite.status, "pending")


class UserSearchTest(unittest.TestCase):
    """Item 8: user search needs sign-in."""

    def test_anonymous_search_refused(self):
        db = make_session()
        add_user(db, "abigail")
        db.commit()
        client, app = anonymous_client(db)
        try:
            self.assertIn(client.get("/api/v1/users/search/users?q=abi").status_code, (401, 403))
        finally:
            app.dependency_overrides.clear()
            db.close()


class FollowRequestEmailTest(unittest.TestCase):
    """Item 9: request, cancel, request again sends one email a day per pair."""

    def setUp(self):
        db = self.db = make_session()
        self.asker = add_user(db, "asker")
        self.target = add_user(db, "target")
        db.commit()

    def tearDown(self):
        self.db.close()

    def _request(self):
        tasks = BackgroundTasks()
        users_api.follow_user("target", tasks, current_user=self.asker, db=self.db)
        return len(tasks.tasks)

    def _cancel(self):
        users_api.unfollow_user("target", current_user=self.asker, db=self.db)

    def test_request_cancel_loop_emails_once(self):
        emails = self._request()
        for _ in range(3):
            self._cancel()
            emails += self._request()
        self.assertEqual(emails, 1)
        pending = self.db.query(Follow).filter_by(follower_id=self.asker.id, status="pending").count()
        self.assertEqual(pending, 1)

    def test_cancelled_request_looks_like_no_follow(self):
        self._request()
        self._cancel()
        res = users_api.check_if_following("target", current_user=self.asker, db=self.db)
        self.assertEqual(res, {"is_following": False, "status": None})
        self.assertEqual(users_api.get_follow_requests(current_user=self.target, db=self.db), [])

    def test_emails_again_after_a_day(self):
        self._request()
        self._cancel()
        follow = self.db.query(Follow).one()
        follow.created_at = datetime.utcnow() - timedelta(days=2)
        self.db.commit()
        self.assertEqual(self._request(), 1)


if __name__ == "__main__":
    unittest.main()
