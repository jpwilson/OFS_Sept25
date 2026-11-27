"""
The family notes migration (c0c2591525d3): one head, offline SQL that matches the
committed hand-off files, and optionally a real upgrade and downgrade on Postgres.

No database is contacted unless FAMILY_PG_URL is set. Point it at a throwaway local
database only: any URL containing "supabase" is refused, and a database that already has
a users table is skipped.

    initdb -D /tmp/ofs-pg && pg_ctl -D /tmp/ofs-pg -o "-p 54329" -l /tmp/ofs-pg.log start
    createdb -p 54329 ofs_family_test
    FAMILY_PG_URL=postgresql://localhost:54329/ofs_family_test \\
        .venv/bin/python -m unittest tests.test_family_notes_migration -v
"""
import io
import os
import unittest
from pathlib import Path
from unittest import mock

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import NullPool

import app.models  # noqa: F401  (registers every table)
from app.core.config import settings
from app.core.database import Base

BACKEND = Path(__file__).resolve().parent.parent
REV, BASE = "c0c2591525d3", "1b7097086e16"
PLACEHOLDER_URL = "postgresql://offline@localhost/offline"
PG_URL = os.environ.get("FAMILY_PG_URL", "").strip()
NEW_TABLES = ("family_notes", "member_details")
NEW_TAG_COLUMNS = ("birth_date_precision", "birthplace", "died_on", "died_on_precision")
TAG_CHECKS = ("tag_profiles_birth_date_precision_check", "tag_profiles_died_on_precision_check")
NOTE_CHECKS = ("family_notes_one_subject", "family_notes_kind_check", "family_notes_body_length",
               "family_notes_precision_check", "family_notes_date_pair", "family_notes_note_undated")
INDEXES = ("ix_family_notes_subject_user", "ix_family_notes_subject_tag", "ix_family_notes_author_id")


def alembic_config(buffer=None) -> Config:
    """No ini file, so env.py leaves the test run's logging alone."""
    cfg = Config(output_buffer=buffer)
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    return cfg


def offline_sql(direction: str) -> str:
    """What `alembic upgrade|downgrade <range> --sql` prints, with no database contacted."""
    buffer = io.StringIO()
    with mock.patch.object(settings, "DATABASE_URL", PLACEHOLDER_URL):
        if direction == "upgrade":
            command.upgrade(alembic_config(buffer), f"{BASE}:{REV}", sql=True)
        else:
            command.downgrade(alembic_config(buffer), f"{REV}:{BASE}", sql=True)
    return buffer.getvalue()


def committed_sql(direction: str):
    """(comment header, generated SQL) of the committed hand-off file."""
    text_ = (BACKEND / "migrations" / f"family_notes_and_birthdays.{direction}.sql").read_text()
    header, _, body = text_.partition("\n\n")
    return header, body


class RevisionTest(unittest.TestCase):
    def test_single_head_on_top_of_app_settings(self):
        script = ScriptDirectory.from_config(alembic_config())
        self.assertEqual(script.get_heads(), [REV])
        self.assertEqual(script.get_revision(REV).down_revision, BASE)


class OfflineSqlTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upgrade = offline_sql("upgrade")
        cls.downgrade = offline_sql("downgrade")

    def test_upgrade_contents(self):
        sql = self.upgrade
        self.assertTrue(sql.lstrip().startswith("BEGIN;"))
        self.assertTrue(sql.rstrip().endswith("COMMIT;"))
        self.assertEqual(sql.count("BEGIN;"), 1)
        self.assertLess(sql.index("SET LOCAL lock_timeout = '5s';"), sql.index("CREATE TABLE"))
        for table in NEW_TABLES:
            self.assertIn(f"CREATE TABLE {table} (", sql)
            self.assertIn(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;", sql)
        for name in NOTE_CHECKS + TAG_CHECKS + ("member_details_visibility_check",):
            self.assertIn(f"CONSTRAINT {name} CHECK", sql)
        for name in INDEXES:
            self.assertIn(f"CREATE INDEX {name} ON family_notes", sql)
        for column in NEW_TAG_COLUMNS:
            self.assertIn(f"ALTER TABLE tag_profiles ADD COLUMN {column} ", sql)
        for role in ("anon", "authenticated"):
            self.assertIn(f"IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}')", sql)
            self.assertIn(f"REVOKE ALL ON TABLE public.family_notes, public.member_details FROM {role};", sql)
            self.assertIn(f"REVOKE ALL ON SEQUENCE public.family_notes_id_seq FROM {role};", sql)
        self.assertIn(f"UPDATE alembic_version SET version_num='{REV}' WHERE alembic_version.version_num = '{BASE}';",
                      sql)
        self.assertNotIn("CREATE TABLE alembic_version", sql)

    def test_downgrade_contents(self):
        sql = self.downgrade
        self.assertTrue(sql.lstrip().startswith("BEGIN;"))
        self.assertTrue(sql.rstrip().endswith("COMMIT;"))
        for name in TAG_CHECKS:
            self.assertIn(f"ALTER TABLE tag_profiles DROP CONSTRAINT {name};", sql)
        for column in NEW_TAG_COLUMNS:
            self.assertIn(f"ALTER TABLE tag_profiles DROP COLUMN {column};", sql)
        order = [sql.index(s) for s in ("DROP COLUMN birth_date_precision;", "DROP TABLE member_details;",
                                        "DROP INDEX ix_family_notes_subject_user;", "DROP TABLE family_notes;")]
        self.assertEqual(order, sorted(order))
        self.assertIn(f"UPDATE alembic_version SET version_num='{BASE}' WHERE alembic_version.version_num = '{REV}';",
                      sql)

    def test_committed_files_match_the_generated_sql(self):
        for direction, generated in (("upgrade", self.upgrade), ("downgrade", self.downgrade)):
            header, body = committed_sql(direction)
            self.assertTrue(all(line.startswith("--") for line in header.splitlines()), direction)
            self.assertIn("NOT APPLIED AUTOMATICALLY; paste into the Supabase SQL editor; "
                          "see docs/app/FAMILY-NOTES.md", header)
            self.assertEqual(body, generated,
                             f"migrations/family_notes_and_birthdays.{direction}.sql is out of date: regenerate it "
                             "with the command in its header")


def refuse_unsafe_url(url: str):
    if "supabase" in url.lower():
        raise RuntimeError("FAMILY_PG_URL points at Supabase. Refusing: use a throwaway local database.")


@unittest.skipUnless(PG_URL, "FAMILY_PG_URL not set (optional real-Postgres check)")
class RealPostgresTest(unittest.TestCase):
    """Builds the schema as it is at 1b7097086e16 from the models, then upgrade, compare
    with the models (no diff), downgrade, and drops everything it made."""

    def setUp(self):
        refuse_unsafe_url(PG_URL)
        self.engine = create_engine(PG_URL, poolclass=NullPool)
        self.addCleanup(self.engine.dispose)
        if inspect(self.engine).has_table("users"):
            raise unittest.SkipTest("FAMILY_PG_URL must be an empty scratch database")
        self.addCleanup(self.drop_everything)

    def drop_everything(self):
        Base.metadata.drop_all(self.engine)
        with self.engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))

    def alembic(self, fn, revision):
        with mock.patch.object(settings, "DATABASE_URL", PG_URL):
            fn(alembic_config(), revision)

    def build_base_schema(self):
        old = [t for t in Base.metadata.sorted_tables if t.name not in NEW_TABLES]
        Base.metadata.create_all(self.engine, tables=old)
        drops = [f"DROP CONSTRAINT {c}" for c in TAG_CHECKS] + [f"DROP COLUMN {c}" for c in NEW_TAG_COLUMNS]
        with self.engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE tag_profiles {', '.join(drops)}"))
        self.alembic(command.stamp, BASE)

    def scalar(self, sql, **params):
        with self.engine.connect() as conn:
            return conn.execute(text(sql), params).scalar()

    def test_upgrade_compare_downgrade(self):
        self.build_base_schema()

        self.alembic(command.upgrade, REV)
        self.assertEqual(self.scalar("SELECT version_num FROM alembic_version"), REV)
        with self.engine.connect() as conn:
            diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
        self.assertEqual(diff, [])
        for table in NEW_TABLES:
            self.assertTrue(self.scalar("SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass(:t)",
                                        t=f"public.{table}"), table)
            for role in ("anon", "authenticated"):
                if self.scalar("SELECT 1 FROM pg_roles WHERE rolname = :r", r=role):
                    self.assertFalse(self.scalar("SELECT has_table_privilege(:r, :t, 'SELECT')",
                                                 r=role, t=f"public.{table}"), (role, table))
        checks = {row for row in self.scalar(
            "SELECT array_agg(conname) FROM pg_constraint WHERE contype = 'c'"
            " AND conrelid IN ('family_notes'::regclass, 'member_details'::regclass, 'tag_profiles'::regclass)")}
        self.assertTrue(set(NOTE_CHECKS + TAG_CHECKS + ("member_details_visibility_check",)) <= checks)

        self.alembic(command.downgrade, BASE)
        self.assertEqual(self.scalar("SELECT version_num FROM alembic_version"), BASE)
        inspector = inspect(self.engine)
        for table in NEW_TABLES:
            self.assertFalse(inspector.has_table(table), table)
        tag_columns = {c["name"] for c in inspector.get_columns("tag_profiles")}
        self.assertFalse(tag_columns & set(NEW_TAG_COLUMNS))


if __name__ == "__main__":
    unittest.main()
