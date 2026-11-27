"""
Notes and history on the family tree: who may read and write, dates, order, paging,
text cleaning, claims, tag deletion and the rate limit (docs/app/FAMILY-NOTES.md).

    cd backend && .venv/bin/python -m unittest tests.test_family_notes -v
"""
import unittest
from datetime import date, datetime, timedelta

from family_fixture import FamilyApiTest, add_tag, link, relate

from app.api import tag_profiles as tag_api
from app.models.family_note import FamilyNote
from app.models.tag_profile_claim import TagProfileClaim
from app.models.tag_profile_relationship_request import TagProfileRelationshipRequest


class MemberAccessTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        u = self.user
        self.ruth, self.tom, self.kate = u("ruth"), u("tom"), u("kate")
        self.pat, self.rex, self.sue, self.sam = u("pat"), u("rex"), u("sue"), u("sam")
        relate(self.db, self.ruth, self.tom)
        relate(self.db, self.ruth, self.kate, a_calls_b="friend", b_calls_a="friend")
        relate(self.db, self.ruth, self.pat, status="pending")
        relate(self.db, self.ruth, self.rex, status="rejected")
        relate(self.db, self.tom, self.sue, a_calls_b="wife", b_calls_a="husband")  # tom's relative only
        self.db.commit()

    def test_family_reads_and_writes(self):
        for viewer in (self.ruth, self.tom, self.kate):
            res = self.get(viewer, "/family-notes", user_id=self.ruth.id)
            self.assertEqual(res.status_code, 200, viewer.username)
            self.assertEqual(res.json()["subject_user_id"], self.ruth.id)
            self.assertTrue(res.json()["can_write"])
            self.assertEqual(self.write(viewer, user_id=self.ruth.id).status_code, 201, viewer.username)

    def test_others_are_refused(self):
        for viewer in (self.pat, self.rex, self.sue, self.sam):
            res = self.get(viewer, "/family-notes", user_id=self.ruth.id)
            self.assertEqual(res.status_code, 403, viewer.username)
            self.assertEqual(res.json()["detail"], "Only Ruth's family can see notes about Ruth.")
            self.assertEqual(self.write(viewer, user_id=self.ruth.id).status_code, 403, viewer.username)
        self.assertEqual(self.db.query(FamilyNote).count(), 0)

    def test_subject_must_be_exactly_one(self):
        self.assertEqual(self.get(self.ruth, "/family-notes").status_code, 422)
        self.assertEqual(self.get(self.ruth, "/family-notes", user_id=self.ruth.id, tag_profile_id=1).status_code,
                         422)
        self.assertEqual(self.post(self.ruth, "/family-notes", {"body": "x"}).status_code, 422)

    def test_missing_subject_is_404(self):
        self.assertEqual(self.get(self.ruth, "/family-notes", user_id=9999).status_code, 404)
        self.assertEqual(self.get(self.ruth, "/family-notes", tag_profile_id=9999).status_code, 404)


class TagAccessTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        u = self.user
        self.ruth, self.tom, self.lin, self.lou = u("ruth"), u("tom"), u("lin"), u("lou")
        self.pen, self.sam, self.mo, self.mo_sis = u("pen"), u("sam"), u("mo"), u("mosis")
        self.ivy = add_tag(self.db, "Ivy", self.ruth)
        relate(self.db, self.ruth, self.tom)            # creator's relative
        link(self.db, self.ivy, self.lin)               # linked user
        relate(self.db, self.lin, self.lou)             # linked user's relative
        self.db.add(TagProfileRelationshipRequest(tag_profile_id=self.ivy.id, proposer_id=self.pen.id,
                                                  relationship_type="aunt", status="pending"))
        self.max = add_tag(self.db, "Max", self.ruth, is_merged=True, merged_user_id=self.mo.id)
        relate(self.db, self.mo, self.mo_sis)
        self.db.commit()

    def test_creator_linked_and_creators_relative_allowed(self):
        for viewer in (self.ruth, self.lin, self.tom):
            res = self.get(viewer, "/family-notes", tag_profile_id=self.ivy.id)
            self.assertEqual(res.status_code, 200, viewer.username)
            self.assertEqual(res.json()["subject_tag_profile_id"], self.ivy.id)
            self.assertEqual(self.write(viewer, tag_profile_id=self.ivy.id).status_code, 201, viewer.username)

    def test_linked_users_relative_pending_link_and_stranger_refused(self):
        for viewer in (self.lou, self.pen, self.sam):
            res = self.get(viewer, "/family-notes", tag_profile_id=self.ivy.id)
            self.assertEqual(res.status_code, 403, viewer.username)
            self.assertEqual(res.json()["detail"], "Only Ivy's family can see notes about Ivy.")
            self.assertEqual(self.write(viewer, tag_profile_id=self.ivy.id).status_code, 403, viewer.username)

    def test_merged_tag_resolves_to_its_member(self):
        res = self.get(self.mo_sis, "/family-notes", tag_profile_id=self.max.id)
        self.assertEqual(res.status_code, 200)
        self.assertEqual((res.json()["subject_user_id"], res.json()["subject_tag_profile_id"]), (self.mo.id, None))
        note = self.write(self.mo_sis, tag_profile_id=self.max.id).json()
        self.assertEqual((note["subject_user_id"], note["subject_tag_profile_id"]), (self.mo.id, None))
        # The tag's creator is not family of the member Max became.
        self.assertEqual(self.get(self.ruth, "/family-notes", tag_profile_id=self.max.id).status_code, 403)


class DemoTest(FamilyApiTest):
    def test_demo_reads_but_cannot_write(self):
        ruth, demo = self.user("ruth"), self.user("demo", is_demo_account=True)
        relate(self.db, ruth, demo)
        self.db.commit()
        note_id = self.write(ruth, user_id=ruth.id).json()["id"]

        res = self.get(demo, "/family-notes", user_id=ruth.id)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["can_write"])
        item = res.json()["notes"]["items"][0]
        self.assertFalse(item["can_edit"] or item["can_delete"])
        self.assertEqual(self.write(demo, user_id=ruth.id).status_code, 403)
        self.assertEqual(self.patch(demo, f"/family-notes/{note_id}", {"body": "x"}).status_code, 403)
        self.assertEqual(self.delete(demo, f"/family-notes/{note_id}").status_code, 403)


class EditDeleteTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        u = self.user
        self.ruth, self.tom, self.kate, self.sam, self.lin = u("ruth"), u("tom"), u("kate"), u("sam"), u("lin")
        self.tom_rel = relate(self.db, self.ruth, self.tom)
        relate(self.db, self.ruth, self.kate)
        self.ivy = add_tag(self.db, "Ivy", self.ruth)
        link(self.db, self.ivy, self.lin)
        self.db.commit()
        self.note = self.write(self.tom, "Ruth taught me to swim", user_id=self.ruth.id).json()["id"]
        self.path = f"/family-notes/{self.note}"

    def lose_access(self):
        self.db.delete(self.tom_rel)
        self.db.commit()

    def test_author_edits(self):
        res = self.patch(self.tom, self.path, {"body": "Ruth taught me to swim, in 1961"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["body"], "Ruth taught me to swim, in 1961")
        self.assertIsNotNone(res.json()["edited_at"])
        self.assertTrue(res.json()["can_edit"])

    def test_only_the_author_edits(self):
        self.assertEqual(self.patch(self.kate, self.path, {"body": "x"}).status_code, 403)
        self.assertEqual(self.patch(self.ruth, self.path, {"body": "x"}).status_code, 403)
        self.assertEqual(self.patch(self.sam, self.path, {"body": "x"}).status_code, 404)

    def test_author_who_lost_access_cannot_edit(self):
        self.lose_access()
        self.assertEqual(self.patch(self.tom, self.path, {"body": "x"}).status_code, 403)

    def test_can_flags(self):
        items = lambda viewer: self.get(viewer, "/family-notes", user_id=self.ruth.id).json()["notes"]["items"]
        flags = lambda viewer: (items(viewer)[0]["can_edit"], items(viewer)[0]["can_delete"])
        self.assertEqual(flags(self.tom), (True, True))
        self.assertEqual(flags(self.ruth), (False, True))
        self.assertEqual(flags(self.kate), (False, False))

    def test_author_deletes_even_after_losing_access(self):
        self.lose_access()
        res = self.delete(self.tom, self.path)
        self.assertEqual((res.status_code, res.json()), (200, {"message": "Note deleted"}))
        self.assertEqual(self.db.query(FamilyNote).count(), 0)

    def test_subject_deletes(self):
        self.assertEqual(self.delete(self.ruth, self.path).status_code, 200)

    def test_tag_creator_deletes(self):
        note = self.write(self.lin, "Ivy's first word", tag_profile_id=self.ivy.id).json()["id"]
        self.assertEqual(self.delete(self.ruth, f"/family-notes/{note}").status_code, 200)

    def test_another_relative_and_stranger_cannot_delete(self):
        self.assertEqual(self.delete(self.kate, self.path).status_code, 403)
        self.assertEqual(self.delete(self.sam, self.path).status_code, 404)
        self.assertEqual(self.delete(self.sam, "/family-notes/9999").status_code, 404)
        self.assertEqual(self.db.query(FamilyNote).count(), 1)


class DateTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        self.ruth = self.user("ruth")
        self.db.commit()

    def history(self, **json):
        return self.write(self.ruth, "Something happened", user_id=self.ruth.id, kind="history", **json)

    def test_normalised(self):
        cases = [
            ({"happened_on": "1952-03-03", "happened_precision": "year"}, ("1952-01-01", "year")),
            ({"happened_on": "1974-06-21", "happened_precision": "month"}, ("1974-06-01", "month")),
            ({"happened_on": "1980-02-29", "happened_precision": "day"}, ("1980-02-29", "day")),
            ({"happened_on": "1980-02-29"}, ("1980-02-29", "day")),  # no precision: a full day
            ({}, (None, None)),
        ]
        for json, expected in cases:
            res = self.history(**json)
            self.assertEqual(res.status_code, 201, json)
            self.assertEqual((res.json()["happened_on"], res.json()["happened_precision"]), expected, json)

    def test_unprocessable(self):
        today = datetime.utcnow().date()  # the server's "today" is UTC
        tomorrow, later = today + timedelta(days=1), today + timedelta(days=3)
        res = self.write(self.ruth, "x", user_id=self.ruth.id, kind="note", happened_on="1990-01-01")
        self.assertEqual((res.status_code, res.json()["detail"]), (422, "Only history entries have a date"))
        res = self.write(self.ruth, "x", user_id=self.ruth.id, happened_precision="year")
        self.assertEqual(res.status_code, 422)
        for json in ({"happened_precision": "year"},
                     {"happened_on": "0999-12-31"},
                     {"happened_on": later.isoformat()},
                     {"happened_on": f"{today.year + 2}-06-01", "happened_precision": "year"},
                     {"happened_on": "1990-01-01", "happened_precision": "decade"},
                     {"happened_on": "not a date"}):
            self.assertEqual(self.history(**json).status_code, 422, json)
        self.assertEqual(self.history(happened_on=tomorrow.isoformat()).status_code, 201)
        self.assertEqual(self.history(happened_on="1000-01-01").status_code, 201)

    def test_patch_merges_and_rechecks(self):
        note = self.history(happened_on="1952-03-03", happened_precision="day").json()["id"]
        path = f"/family-notes/{note}"

        res = self.patch(self.ruth, path, {"happened_precision": "month"})
        self.assertEqual((res.json()["happened_on"], res.json()["happened_precision"]), ("1952-03-01", "month"))
        res = self.patch(self.ruth, path, {"happened_on": "1953-07-09"})  # keeps the month precision
        self.assertEqual((res.json()["happened_on"], res.json()["happened_precision"]), ("1953-07-01", "month"))
        self.assertEqual(self.patch(self.ruth, path, {"kind": "note"}).status_code, 422)
        res = self.patch(self.ruth, path, {"happened_on": None})
        self.assertEqual((res.json()["happened_on"], res.json()["happened_precision"]), (None, None))
        self.assertEqual(self.patch(self.ruth, path, {"kind": "note"}).json()["kind"], "note")
        self.assertEqual(self.patch(self.ruth, path, {"happened_on": "1990-01-01"}).status_code, 422)
        self.assertEqual(self.patch(self.ruth, path, {"body": None}).status_code, 422)
        self.assertEqual(self.patch(self.ruth, path, {"kind": None}).status_code, 422)

    def test_null_precision_clears_the_date(self):
        note = self.history(happened_on="1952-03-03").json()["id"]
        res = self.patch(self.ruth, f"/family-notes/{note}", {"happened_precision": None})
        self.assertEqual((res.json()["happened_on"], res.json()["happened_precision"]), (None, None))


class OrderAndPagingTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        self.ruth = self.user("ruth")
        self.db.commit()
        start = datetime(2026, 1, 1)

        def add(kind, body, minutes, happened_on=None, precision=None):
            self.db.add(FamilyNote(subject_user_id=self.ruth.id, author_id=self.ruth.id, kind=kind, body=body,
                                   happened_on=happened_on, happened_precision=precision,
                                   created_at=start + timedelta(minutes=minutes)))
        add("note", "first", 1)
        add("note", "second", 2)
        add("note", "third", 3)
        add("history", "undated, older", 1)
        add("history", "married", 2, date(1974, 6, 1), "month")
        add("history", "born", 3, date(1952, 1, 1), "year")
        add("history", "undated, newer", 4)
        add("history", "also 1974", 5, date(1974, 6, 1), "month")
        self.db.commit()

    def bodies(self, page):
        return [item["body"] for item in page["items"]]

    def test_order(self):
        res = self.get(self.ruth, "/family-notes", user_id=self.ruth.id).json()
        self.assertEqual(self.bodies(res["notes"]), ["third", "second", "first"])
        self.assertEqual(self.bodies(res["history"]),
                         ["born", "married", "also 1974", "undated, older", "undated, newer"])
        self.assertFalse(res["notes"]["has_more"])

    def test_paging(self):
        res = self.get(self.ruth, "/family-notes", user_id=self.ruth.id, kind="note", limit=2).json()
        self.assertIsNone(res["history"])
        self.assertEqual((self.bodies(res["notes"]), res["notes"]["has_more"]), (["third", "second"], True))
        res = self.get(self.ruth, "/family-notes", user_id=self.ruth.id, kind="note", limit=2, skip=2).json()
        self.assertEqual((self.bodies(res["notes"]), res["notes"]["has_more"]), (["first"], False))
        res = self.get(self.ruth, "/family-notes", user_id=self.ruth.id, kind="history", limit=5).json()
        self.assertIsNone(res["notes"])
        self.assertFalse(res["history"]["has_more"])

    def test_limit_bounds(self):
        for params in ({"limit": 51}, {"limit": 0}, {"skip": -1}, {"kind": "diary"}):
            res = self.get(self.ruth, "/family-notes", user_id=self.ruth.id, **params)
            self.assertEqual(res.status_code, 422, params)
        self.assertEqual(self.get(self.ruth, "/family-notes", user_id=self.ruth.id, limit=50).status_code, 200)


class TextTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        self.ruth = self.user("ruth")
        self.db.commit()

    def body_of(self, raw):
        res = self.write(self.ruth, raw, user_id=self.ruth.id)
        self.assertEqual(res.status_code, 201, repr(raw))
        return res.json()["body"]

    def test_cleaning(self):
        self.assertEqual(self.body_of("  line one\r\nline two\r\n  "), "line one\nline two")
        self.assertEqual(self.body_of("a\n\n\n\n\nb"), "a\n\nb")
        self.assertEqual(self.body_of("tab\there\x00\x07\x1b\x7f\x85"), "tab\there")
        self.assertEqual(self.body_of("evil‮‪⁦⁩ text"), "evil text")
        family = "\U0001F468‍\U0001F469‍\U0001F467"  # zero-width joiners are kept
        self.assertEqual(self.body_of(f"Us {family}"), f"Us {family}")

    def test_html_is_literal_text(self):
        self.assertEqual(self.body_of("<b>bold</b> & <script>x</script>"), "<b>bold</b> & <script>x</script>")
        listed = self.get(self.ruth, "/family-notes", user_id=self.ruth.id).json()
        self.assertIn("<b>bold</b>", listed["notes"]["items"][0]["body"])

    def test_length(self):
        for raw in ("", "   \n\t  ", "‮", "x" * 4001):
            self.assertEqual(self.write(self.ruth, raw, user_id=self.ruth.id).status_code, 422, repr(raw[:5]))
        self.assertEqual(len(self.body_of("x" * 4000)), 4000)
        self.assertEqual(len(self.body_of("x" * 4000 + "\n\n\n   ")), 4000)  # cleaned before counting


class ClaimAndTagDeleteTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        u = self.user
        self.ruth, self.tom, self.ivy_user, self.ivy_sis = u("ruth"), u("tom"), u("ivy"), u("ivysis")
        self.ivy = add_tag(self.db, "Ivy", self.ruth)
        relate(self.db, self.ruth, self.tom)
        relate(self.db, self.ivy_user, self.ivy_sis)
        self.db.commit()
        self.write(self.tom, "Ivy's first steps", tag_profile_id=self.ivy.id)
        self.write(self.ruth, "Born in Cork", tag_profile_id=self.ivy.id, kind="history",
                   happened_on="2019-01-01", happened_precision="year")

    def test_claim_moves_notes_and_changes_readers(self):
        claim = TagProfileClaim(tag_profile_id=self.ivy.id, claimant_id=self.ivy_user.id, status="pending")
        self.db.add(claim)
        self.db.commit()
        tag_api.approve_claim(claim.id, current_user=self.ruth, db=self.db)

        notes = self.db.query(FamilyNote).all()
        self.assertEqual({(n.subject_user_id, n.subject_tag_profile_id) for n in notes}, {(self.ivy_user.id, None)})
        res = self.get(self.ivy_sis, "/family-notes", user_id=self.ivy_user.id)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()["notes"]["items"]) + len(res.json()["history"]["items"]), 2)
        self.assertEqual(self.get(self.tom, "/family-notes", user_id=self.ivy_user.id).status_code, 403)
        self.assertEqual(self.get(self.tom, "/family-notes", tag_profile_id=self.ivy.id).status_code, 403)

    def test_tag_delete_removes_its_notes(self):
        other = add_tag(self.db, "Biscuit", self.ruth)
        self.db.commit()
        self.write(self.ruth, "Good dog", tag_profile_id=other.id)
        tag_api.delete_tag_profile(self.ivy.id, current_user=self.ruth, db=self.db)
        self.assertEqual([n.body for n in self.db.query(FamilyNote).all()], ["Good dog"])


class RateLimitTest(FamilyApiTest):
    def test_31st_post_is_refused(self):
        ruth = self.user("ruth")
        self.db.commit()
        for i in range(30):
            self.assertEqual(self.write(ruth, f"note {i}", user_id=ruth.id).status_code, 201, i)
        self.assertEqual(self.write(ruth, "one too many", user_id=ruth.id).status_code, 429)
        self.assertEqual(self.db.query(FamilyNote).count(), 30)


if __name__ == "__main__":
    unittest.main()
