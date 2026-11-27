"""
Optional: the admin analytics tests again, on a real Postgres, so the shared SQL text is
checked against the real timezone(), date_trunc(), GREATEST and JSON operators.

Skipped unless ANALYTICS_PG_URL is set. Point it at a throwaway local database only:
- any URL containing "supabase" is refused (the test errors and connects to nothing);
- a database that already has a users table or an auth schema is skipped;
- everything runs inside one transaction that is rolled back.

    initdb -D /tmp/ofs-pg && pg_ctl -D /tmp/ofs-pg -o "-p 54329" -l /tmp/ofs-pg.log start
    createdb -p 54329 ofs_analytics_test
    ANALYTICS_PG_URL=postgresql://localhost:54329/ofs_analytics_test \\
        .venv/bin/python -m unittest tests.test_admin_analytics_pg -v
"""
import os
import unittest

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

import test_admin_analytics as base
from app.core.database import Base

PG_URL = os.environ.get("ANALYTICS_PG_URL", "").strip()

PG_AUTH_TABLES = (
    "CREATE SCHEMA auth",
    "CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, created_at timestamptz, deleted_at timestamptz,"
    " email_confirmed_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb)",
    "CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid, created_at timestamptz)",
    "CREATE TABLE auth.audit_log_entries (id uuid PRIMARY KEY, payload json, created_at timestamptz)",
)


def refuse_unsafe_url(url: str):
    if "supabase" in url.lower():
        raise RuntimeError("ANALYTICS_PG_URL points at Supabase. Refusing: use a throwaway local database.")


def setUpModule():
    if PG_URL:
        refuse_unsafe_url(PG_URL)


class PostgresDb:
    """Mixin: a Postgres session inside a transaction that is rolled back afterwards."""

    def make_db(self):
        refuse_unsafe_url(PG_URL)
        engine = create_engine(PG_URL, poolclass=NullPool)
        conn = engine.connect()
        taken = conn.execute(text(
            "SELECT to_regclass('public.users') IS NOT NULL"
            " OR EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth')")).scalar()
        conn.rollback()  # end the check's autobegun transaction
        if taken:
            conn.close()
            engine.dispose()
            raise unittest.SkipTest("ANALYTICS_PG_URL must be an empty scratch database")
        outer = conn.begin()
        if self.with_auth:
            for ddl in PG_AUTH_TABLES:
                conn.execute(text(ddl))
        Base.metadata.create_all(conn)
        db = Session(bind=conn, join_transaction_mode="create_savepoint")

        def cleanup():
            db.close()
            outer.rollback()
            conn.close()
            engine.dispose()

        self.addCleanup(cleanup)
        return db


skip = unittest.skipUnless(PG_URL, "set ANALYTICS_PG_URL to a throwaway local Postgres to run")


@skip
class PgBucketSqlTest(PostgresDb, base.BucketSqlTest):
    pass


@skip
class PgOverviewTest(PostgresDb, base.OverviewTest):
    pass


@skip
class PgSessionsFallbackTest(PostgresDb, base.SessionsFallbackTest):
    pass


@skip
class PgNoAuthSchemaTest(PostgresDb, base.NoAuthSchemaTest):
    pass


@skip
class PgMembersTest(PostgresDb, base.MembersTest):
    pass


@skip
class PgUnfinishedTest(PostgresDb, base.UnfinishedTest):
    pass


@skip
class PgVisitorsTest(PostgresDb, base.VisitorsTest):
    pass


class RefuseSupabaseTest(unittest.TestCase):
    def test_supabase_urls_are_refused(self):
        for url in ("postgresql://postgres.x:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
                    "postgresql://db.abc.SUPABASE.co:5432/postgres"):
            with self.assertRaises(RuntimeError):
                refuse_unsafe_url(url)
        refuse_unsafe_url("postgresql://localhost:54329/ofs_analytics_test")
