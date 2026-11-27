-- family_notes_and_birthdays (downgrade), Alembic revision c0c2591525d3 (revises 1b7097086e16).
--
-- NOT APPLIED AUTOMATICALLY; paste into the Supabase SQL editor; see docs/app/FAMILY-NOTES.md.
--
-- Rollback only. Revert the code merges first, and export family_notes and
-- member_details as CSV if the data should be kept: this drops them.
--
-- Generated offline; do not edit by hand (tests/test_family_notes_migration.py compares it):
--   cd backend && DATABASE_URL='postgresql://offline@localhost/offline' alembic downgrade c0c2591525d3:1b7097086e16 --sql

BEGIN;

-- Running downgrade c0c2591525d3 -> 1b7097086e16

SET LOCAL lock_timeout = '5s';

ALTER TABLE tag_profiles DROP CONSTRAINT tag_profiles_died_on_precision_check;

ALTER TABLE tag_profiles DROP CONSTRAINT tag_profiles_birth_date_precision_check;

ALTER TABLE tag_profiles DROP COLUMN died_on_precision;

ALTER TABLE tag_profiles DROP COLUMN died_on;

ALTER TABLE tag_profiles DROP COLUMN birthplace;

ALTER TABLE tag_profiles DROP COLUMN birth_date_precision;

DROP TABLE member_details;

DROP INDEX ix_family_notes_author_id;

DROP INDEX ix_family_notes_subject_tag;

DROP INDEX ix_family_notes_subject_user;

DROP TABLE family_notes;

UPDATE alembic_version SET version_num='1b7097086e16' WHERE alembic_version.version_num = 'c0c2591525d3';

COMMIT;

