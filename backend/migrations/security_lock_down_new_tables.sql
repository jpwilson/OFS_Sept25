-- Security: lock down tables created after the February 2026 RLS hardening.
--
-- NOT APPLIED AUTOMATICALLY. Run once in the Supabase SQL editor after review.
--
-- `ai_usage_log` (Feb 9, 2026) and `app_settings` (Mar 21, 2026) were created by
-- Alembic after RLS was enabled on the other public tables. New tables in the
-- `public` schema are reachable through Supabase's REST API (PostgREST) with the
-- public anon key unless RLS is on. The browser never queries tables directly
-- (all data goes through the FastAPI backend, which connects as the database
-- owner and is not affected by RLS), so these tables need no policies at all.

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_usage_log FROM anon, authenticated;
REVOKE ALL ON TABLE public.app_settings FROM anon, authenticated;

-- Check afterwards: every public table should show rowsecurity = true.
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;

-- OPTIONAL, recommended once you have confirmed nothing in the browser or the
-- iOS app reads tables through supabase-js (today only Auth and Storage are
-- used): stop the anon/authenticated roles reaching ANY public table through
-- the REST API, now and for tables created later.
--
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
