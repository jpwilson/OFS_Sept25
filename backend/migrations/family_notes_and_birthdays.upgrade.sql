-- family_notes_and_birthdays (upgrade), Alembic revision c0c2591525d3 (revises 1b7097086e16).
--
-- NOT APPLIED AUTOMATICALLY; paste into the Supabase SQL editor; see docs/app/FAMILY-NOTES.md.
--
-- Before: SELECT version_num FROM alembic_version; must return 1b7097086e16.
-- Run it once, whole. It is one transaction: if it stops (for example on the 5 s
-- lock timeout), nothing was applied and it can simply be run again.
--
-- Generated offline; do not edit by hand (tests/test_family_notes_migration.py compares it):
--   cd backend && DATABASE_URL='postgresql://offline@localhost/offline' alembic upgrade 1b7097086e16:c0c2591525d3 --sql

BEGIN;

-- Running upgrade 1b7097086e16 -> c0c2591525d3

SET LOCAL lock_timeout = '5s';

CREATE TABLE family_notes (
    id SERIAL NOT NULL, 
    subject_user_id INTEGER, 
    subject_tag_profile_id INTEGER, 
    author_id INTEGER NOT NULL, 
    kind VARCHAR(10) NOT NULL, 
    body TEXT NOT NULL, 
    happened_on DATE, 
    happened_precision VARCHAR(5), 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    edited_at TIMESTAMP WITHOUT TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(subject_user_id) REFERENCES users (id) ON DELETE CASCADE, 
    FOREIGN KEY(subject_tag_profile_id) REFERENCES tag_profiles (id) ON DELETE CASCADE, 
    FOREIGN KEY(author_id) REFERENCES users (id) ON DELETE CASCADE, 
    CONSTRAINT family_notes_one_subject CHECK ((subject_user_id IS NULL) <> (subject_tag_profile_id IS NULL)), 
    CONSTRAINT family_notes_kind_check CHECK (kind IN ('note','history')), 
    CONSTRAINT family_notes_body_length CHECK (length(body) BETWEEN 1 AND 4000), 
    CONSTRAINT family_notes_precision_check CHECK (happened_precision IS NULL OR happened_precision IN ('day','month','year')), 
    CONSTRAINT family_notes_date_pair CHECK ((happened_on IS NULL) = (happened_precision IS NULL)), 
    CONSTRAINT family_notes_note_undated CHECK (kind = 'history' OR happened_on IS NULL)
);

CREATE INDEX ix_family_notes_subject_user ON family_notes (subject_user_id, kind);

CREATE INDEX ix_family_notes_subject_tag ON family_notes (subject_tag_profile_id, kind);

CREATE INDEX ix_family_notes_author_id ON family_notes (author_id);

CREATE TABLE member_details (
    user_id INTEGER NOT NULL, 
    birth_date DATE, 
    birthplace VARCHAR(120), 
    birth_date_visibility VARCHAR(10) DEFAULT 'relatives' NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (user_id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    CONSTRAINT member_details_visibility_check CHECK (birth_date_visibility IN ('relatives','only_me'))
);

ALTER TABLE tag_profiles ADD COLUMN birth_date_precision VARCHAR(5);

ALTER TABLE tag_profiles ADD COLUMN birthplace VARCHAR(120);

ALTER TABLE tag_profiles ADD COLUMN died_on DATE;

ALTER TABLE tag_profiles ADD COLUMN died_on_precision VARCHAR(5);

ALTER TABLE tag_profiles ADD CONSTRAINT tag_profiles_birth_date_precision_check CHECK (birth_date_precision IS NULL OR (birth_date IS NOT NULL AND birth_date_precision IN ('day','month','year')));

ALTER TABLE tag_profiles ADD CONSTRAINT tag_profiles_died_on_precision_check CHECK ((died_on IS NULL AND died_on_precision IS NULL) OR (died_on IS NOT NULL AND died_on_precision IN ('day','month','year')));

ALTER TABLE public.family_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.member_details ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.family_notes, public.member_details FROM anon;
    REVOKE ALL ON SEQUENCE public.family_notes_id_seq FROM anon;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.family_notes, public.member_details FROM authenticated;
    REVOKE ALL ON SEQUENCE public.family_notes_id_seq FROM authenticated;
  END IF;
END
$$;

UPDATE alembic_version SET version_num='c0c2591525d3' WHERE alembic_version.version_num = '1b7097086e16';

COMMIT;

