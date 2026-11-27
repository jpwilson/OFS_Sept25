"""
Birthdays: a member's own (member_details), what relatives see in /relationships, and the
new tag profile fields (docs/app/FAMILY-NOTES.md).

    cd backend && .venv/bin/python -m unittest tests.test_family_details -v
"""
import unittest
from datetime import date, datetime, timedelta

from family_fixture import FamilyApiTest, add_tag, link, mutual_follow, relate

from app.models.member_details import MemberDetails
from app.models.tag_profile import TagProfile

DETAILS = "/users/me/family-details"


class MemberBirthdayTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        self.ruth, self.tom = self.user("ruth"), self.user("tom")
        relate(self.db, self.ruth, self.tom)
        self.db.commit()

    def tom_sees(self):
        rows = self.get(self.tom, "/relationships").json()
        row = next(r for r in rows if r["other_user_id"] == self.ruth.id)
        return row["other_user_birth_date"], row["other_user_birthplace"]

    def test_relatives_see_it_unless_only_me(self):
        self.assertEqual(self.tom_sees(), (None, None))
        self.put(self.ruth, DETAILS, {"birth_date": "1952-03-03", "birthplace": "Cork"})
        self.assertEqual(self.tom_sees(), ("1952-03-03", "Cork"))
        self.assertEqual(self.get(self.tom, f"/relationships/with/{self.ruth.id}").json()["other_user_birth_date"],
                         "1952-03-03")
        self.put(self.ruth, DETAILS, {"birth_date_visibility": "only_me"})
        self.assertEqual(self.tom_sees(), (None, None))
        self.assertIsNone(self.get(self.tom, f"/relationships/with/{self.ruth.id}").json()["other_user_birth_date"])

    def test_birth_keys_are_the_last_relationship_keys(self):
        keys = list(self.get(self.tom, "/relationships").json()[0])
        self.assertEqual(keys[-2:], ["other_user_birth_date", "other_user_birthplace"])

    def test_null_on_propose_pending_and_accept_shows_it(self):
        kate = self.user("kate")
        mutual_follow(self.db, self.ruth, kate)
        self.db.commit()
        self.put(kate, DETAILS, {"birth_date": "1980-05-05", "birthplace": "Leeds"})

        proposed = self.post(self.ruth, "/relationships/propose",
                             {"other_user_id": kate.id, "my_relationship_to_them": "friend",
                              "their_relationship_to_me": "friend"})
        self.assertEqual(proposed.status_code, 200)
        self.assertEqual((proposed.json()["other_user_birth_date"], proposed.json()["other_user_birthplace"]),
                         (None, None))
        pending = self.get(self.ruth, f"/relationships/with/{kate.id}").json()
        self.assertEqual((pending["status"], pending["other_user_birth_date"]), ("pending", None))

        self.put(self.ruth, DETAILS, {"birth_date": "1952-03-03"})
        accepted = self.post(kate, f"/relationships/{proposed.json()['id']}/accept", {}).json()
        self.assertEqual(accepted["other_user_birth_date"], "1952-03-03")

    def test_users_me_returns_them(self):
        me = self.get(self.ruth, "/users/me").json()
        self.assertEqual((me["birth_date"], me["birthplace"], me["birth_date_visibility"]),
                         (None, None, "relatives"))
        self.put(self.ruth, DETAILS, {"birth_date": "1952-03-03", "birthplace": "Cork",
                                      "birth_date_visibility": "only_me"})
        me = self.get(self.ruth, "/users/me").json()
        self.assertEqual((me["birth_date"], me["birthplace"], me["birth_date_visibility"]),
                         ("1952-03-03", "Cork", "only_me"))

    def test_put_sets_clears_and_keeps(self):
        res = self.put(self.ruth, DETAILS, {"birth_date": "1952-03-03", "birthplace": "  Cork  "})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"birth_date": "1952-03-03", "birthplace": "Cork",
                                      "birth_date_visibility": "relatives"})
        res = self.put(self.ruth, DETAILS, {"birthplace": None})  # clears one, keeps the rest
        self.assertEqual(res.json(), {"birth_date": "1952-03-03", "birthplace": None,
                                      "birth_date_visibility": "relatives"})
        res = self.put(self.ruth, DETAILS, {})
        self.assertEqual(res.json()["birth_date"], "1952-03-03")
        res = self.put(self.ruth, DETAILS, {"birth_date": None, "birthplace": None})
        self.assertEqual(res.json(), {"birth_date": None, "birthplace": None, "birth_date_visibility": "relatives"})
        self.assertEqual(self.db.query(MemberDetails).count(), 1)

    def test_put_unprocessable(self):
        today = datetime.utcnow().date()
        for json in ({"birth_date_visibility": "public"},
                     {"birth_date_visibility": None},
                     {"birth_date": (today + timedelta(days=2)).isoformat()},
                     {"birth_date": "1899-12-31"},
                     {"birthplace": "Cork\nIreland"},
                     {"birthplace": "x" * 121}):
            self.assertEqual(self.put(self.ruth, DETAILS, json).status_code, 422, json)
        self.assertEqual(self.put(self.ruth, DETAILS, {"birth_date": today.isoformat()}).status_code, 200)
        self.assertEqual(self.put(self.ruth, DETAILS, {"birthplace": "x" * 120}).status_code, 200)

    def test_demo_cannot_put(self):
        demo = self.user("demo", is_demo_account=True)
        self.db.commit()
        self.assertEqual(self.put(demo, DETAILS, {"birth_date": "1990-01-01"}).status_code, 403)
        self.assertEqual(self.db.query(MemberDetails).count(), 0)

    def test_public_profile_and_search_have_no_birth_keys(self):
        self.put(self.ruth, DETAILS, {"birth_date": "1952-03-03", "birthplace": "Cork"})
        profile = self.client.get("/api/v1/users/ruth").json()
        found = self.get(self.tom, "/users/search/users", q="ruth").json()
        self.assertTrue(found)
        for keys in [list(profile)] + [list(row) for row in found]:
            self.assertFalse([k for k in keys if "birth" in k], keys)


class TagProfileFieldsTest(FamilyApiTest):
    def setUp(self):
        super().setUp()
        self.ruth, self.lin, self.sam = self.user("ruth"), self.user("lin"), self.user("sam")
        self.gran = add_tag(self.db, "Gran", self.ruth, relationship_to_creator="grandmother",
                            photo_url="https://example.test/gran.jpg", birth_date=date(1921, 1, 1),
                            birth_date_precision="year", birthplace="Cork",
                            died_on=date(2019, 1, 1), died_on_precision="year")
        link(self.db, self.gran, self.lin)
        self.db.commit()
        self.path = f"/tag-profiles/{self.gran.id}"

    def fields(self, body):
        return {k: body[k] for k in ("name", "relationship_to_creator", "photo_url", "birth_date",
                                     "birth_date_precision", "birthplace", "died_on", "died_on_precision")}

    def test_new_fields_follow_birth_date(self):
        keys = list(self.get(self.ruth, self.path).json())
        at = keys.index("birth_date")
        self.assertEqual(keys[at:at + 5], ["birth_date", "birth_date_precision", "birthplace", "died_on",
                                           "died_on_precision"])

    def test_create_and_mine_pass_them_through(self):
        res = self.post(self.ruth, "/tag-profiles", {"name": "Biscuit", "birth_date": "2015-06-20",
                                                     "birth_date_precision": "month", "birthplace": "Leeds"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual((res.json()["birth_date"], res.json()["birth_date_precision"], res.json()["birthplace"]),
                         ("2015-06-01", "month", "Leeds"))
        mine = {t["name"]: t for t in self.get(self.ruth, "/tag-profiles/mine").json()}
        self.assertEqual(mine["Gran"]["died_on"], "2019-01-01")
        self.assertEqual(mine["Biscuit"]["birth_date_precision"], "month")

    def test_gated_like_the_birth_date(self):
        for viewer in (self.ruth, self.lin):
            body = self.get(viewer, self.path).json()
            self.assertEqual((body["birth_date"], body["birthplace"], body["died_on"]),
                             ("1921-01-01", "Cork", "2019-01-01"), viewer.username)
        body = self.get(self.sam, self.path).json()
        self.assertEqual([body[k] for k in ("birth_date", "birth_date_precision", "birthplace", "died_on",
                                            "died_on_precision")], [None] * 5)
        self.assertEqual(body["name"], "Gran")

    def test_put_applies_only_the_fields_sent(self):
        before = self.fields(self.get(self.ruth, self.path).json())
        res = self.put(self.ruth, self.path, {"name": "Granny"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.fields(res.json()), {**before, "name": "Granny"})

        res = self.put(self.ruth, self.path, {"birthplace": None, "photo_url": None})
        self.assertEqual(self.fields(res.json()), {**before, "name": "Granny", "birthplace": None, "photo_url": None})

        res = self.put(self.ruth, self.path, {"birth_date": None, "died_on": None, "relationship_to_creator": None})
        self.assertEqual([res.json()[k] for k in ("birth_date", "birth_date_precision", "died_on",
                                                  "died_on_precision", "relationship_to_creator")], [None] * 5)

    def test_put_dates(self):
        res = self.put(self.ruth, self.path, {"died_on": "2019-03-14", "died_on_precision": "day"})
        self.assertEqual((res.json()["died_on"], res.json()["died_on_precision"]), ("2019-03-14", "day"))
        res = self.put(self.ruth, self.path, {"birth_date": "1921-07-04"})  # keeps the year precision
        self.assertEqual((res.json()["birth_date"], res.json()["birth_date_precision"]), ("1921-01-01", "year"))
        res = self.put(self.ruth, self.path, {"birth_date": "1921-07-04", "birth_date_precision": None})
        self.assertEqual((res.json()["birth_date"], res.json()["birth_date_precision"]), ("1921-07-04", None))
        # Same year at the coarser precision is not "before".
        res = self.put(self.ruth, self.path, {"birth_date": "2019-06-10", "died_on": "2019-01-01",
                                              "died_on_precision": "year"})
        self.assertEqual(res.status_code, 200)

    def test_put_unprocessable(self):
        for json in ({"name": None},
                     {"died_on": "1920-12-31", "died_on_precision": "day"},
                     {"died_on": "1919-05-01", "died_on_precision": "year"},
                     {"birthplace": "Cork\nIreland"},
                     {"died_on_precision": "decade"}):
            self.assertEqual(self.put(self.ruth, self.path, json).status_code, 422, json)
        self.db.expire_all()
        self.assertEqual(self.db.get(TagProfile, self.gran.id).name, "Gran")

        # A null date clears its precision too; a precision alone needs a date.
        self.assertEqual(self.put(self.ruth, self.path, {"birth_date": None, "birth_date_precision": "year",
                                                         "died_on": None}).status_code, 200)
        self.assertEqual(self.put(self.ruth, self.path, {"birth_date_precision": "year"}).status_code, 422)
        self.assertEqual(self.put(self.ruth, self.path, {"died_on_precision": "day"}).status_code, 422)

    def test_create_unprocessable(self):
        for json in ({"name": "X", "birth_date_precision": "year"},
                     {"name": "X", "birth_date": "1950-01-01", "died_on": "1940-01-01"}):
            self.assertEqual(self.post(self.ruth, "/tag-profiles", json).status_code, 422, json)


if __name__ == "__main__":
    unittest.main()
