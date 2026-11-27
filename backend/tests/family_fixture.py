"""
Shared set-up for the family notes and birthday tests: an in-memory SQLite database and
a TestClient whose signed-in member is whoever the test says.
"""
import unittest

from fastapi.testclient import TestClient

from helpers import make_session, add_user, add_follow

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.tag_profile import TagProfile
from app.models.tag_profile_relationship import TagProfileRelationship
from app.models.user_relationship import UserRelationship
from app.api import family_notes as family_api

API = "/api/v1"


def relate(db, a, b, status="accepted", a_calls_b="sister", b_calls_a="brother"):
    """A user_relationships row between a and b, stored in the a < b order."""
    if a.id > b.id:
        a, b, a_calls_b, b_calls_a = b, a, b_calls_a, a_calls_b
    rel = UserRelationship(user_a_id=a.id, user_b_id=b.id, relationship_a_to_b=a_calls_b,
                           relationship_b_to_a=b_calls_a, status=status, proposed_by_id=a.id)
    db.add(rel)
    db.flush()
    return rel


def add_tag(db, name, creator, **kw):
    tag = TagProfile(name=name, created_by_id=creator.id, **kw)
    db.add(tag)
    db.flush()
    return tag


def link(db, tag, user, word="aunt"):
    row = TagProfileRelationship(tag_profile_id=tag.id, user_id=user.id, relationship_type=word)
    db.add(row)
    db.flush()
    return row


def mutual_follow(db, a, b):
    add_follow(db, a, b)
    add_follow(db, b, a)


class FamilyApiTest(unittest.TestCase):
    """Each test signs in as a member with `self.as_(user)` and calls the real routes."""

    def setUp(self):
        from app.main import app
        self.db = make_session()
        self.viewer = None
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.viewer
        self.client = TestClient(app)
        family_api._create_limiter.reset()
        self.addCleanup(app.dependency_overrides.clear)
        self.addCleanup(self.db.close)

    def user(self, username, **kw):
        kw.setdefault("display_name", username.capitalize())
        return add_user(self.db, username, **kw)

    def as_(self, user):
        self.viewer = user
        return self.client

    # Thin wrappers that return the response.
    def get(self, user, path, **params):
        return self.as_(user).get(API + path, params=params)

    def post(self, user, path, json):
        return self.as_(user).post(API + path, json=json)

    def patch(self, user, path, json):
        return self.as_(user).patch(API + path, json=json)

    def put(self, user, path, json):
        return self.as_(user).put(API + path, json=json)

    def delete(self, user, path):
        return self.as_(user).delete(API + path)

    def write(self, author, body="A memory", **json):
        """POST a note about json's user_id or tag_profile_id; returns the response."""
        return self.post(author, "/family-notes", {"body": body, **json})
