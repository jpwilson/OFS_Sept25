"""family_notes_and_birthdays

Notes and history about people on the family tree, members' own birthdays, and more
about tagged people (birth date precision, birthplace, date of death).

Not applied automatically: the owner pastes the generated SQL
(backend/migrations/family_notes_and_birthdays.upgrade.sql) into the Supabase SQL
editor. See docs/app/FAMILY-NOTES.md.

Revision ID: c0c2591525d3
Revises: 1b7097086e16
Create Date: 2026-11-27 12:37:54.094924

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0c2591525d3'
down_revision: Union[str, None] = '1b7097086e16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PRECISIONS = "('day','month','year')"

# The browser never reads tables directly; the backend connects as the table owner,
# so the new tables get RLS with no policies and no grants for the API roles.
API_ROLES = ("anon", "authenticated")


def _is_postgres() -> bool:
    return op.get_context().dialect.name == "postgresql"


def _fail_fast_on_locks() -> None:
    """Fail rather than queue behind writes to users (the new foreign keys lock it)."""
    if _is_postgres():
        op.execute("SET LOCAL lock_timeout = '5s'")


def upgrade() -> None:
    _fail_fast_on_locks()

    op.create_table(
        'family_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('subject_user_id', sa.Integer(), nullable=True),
        sa.Column('subject_tag_profile_id', sa.Integer(), nullable=True),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=10), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('happened_on', sa.Date(), nullable=True),
        sa.Column('happened_precision', sa.String(length=5), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('edited_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['subject_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_tag_profile_id'], ['tag_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            '(subject_user_id IS NULL) <> (subject_tag_profile_id IS NULL)',
            name='family_notes_one_subject'),
        sa.CheckConstraint("kind IN ('note','history')", name='family_notes_kind_check'),
        sa.CheckConstraint('length(body) BETWEEN 1 AND 4000', name='family_notes_body_length'),
        sa.CheckConstraint(
            f'happened_precision IS NULL OR happened_precision IN {PRECISIONS}',
            name='family_notes_precision_check'),
        sa.CheckConstraint(
            '(happened_on IS NULL) = (happened_precision IS NULL)', name='family_notes_date_pair'),
        sa.CheckConstraint("kind = 'history' OR happened_on IS NULL", name='family_notes_note_undated'),
    )
    op.create_index('ix_family_notes_subject_user', 'family_notes', ['subject_user_id', 'kind'])
    op.create_index('ix_family_notes_subject_tag', 'family_notes', ['subject_tag_profile_id', 'kind'])
    op.create_index('ix_family_notes_author_id', 'family_notes', ['author_id'])

    op.create_table(
        'member_details',
        sa.Column('user_id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('birthplace', sa.String(length=120), nullable=True),
        sa.Column('birth_date_visibility', sa.String(length=10), nullable=False,
                  server_default=sa.text("'relatives'")),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
        sa.CheckConstraint(
            "birth_date_visibility IN ('relatives','only_me')", name='member_details_visibility_check'),
    )

    op.add_column('tag_profiles', sa.Column('birth_date_precision', sa.String(length=5), nullable=True))
    op.add_column('tag_profiles', sa.Column('birthplace', sa.String(length=120), nullable=True))
    op.add_column('tag_profiles', sa.Column('died_on', sa.Date(), nullable=True))
    op.add_column('tag_profiles', sa.Column('died_on_precision', sa.String(length=5), nullable=True))
    op.create_check_constraint(
        'tag_profiles_birth_date_precision_check', 'tag_profiles',
        f'birth_date_precision IS NULL OR (birth_date IS NOT NULL AND birth_date_precision IN {PRECISIONS})')
    op.create_check_constraint(
        'tag_profiles_died_on_precision_check', 'tag_profiles',
        '(died_on IS NULL AND died_on_precision IS NULL)'
        f' OR (died_on IS NOT NULL AND died_on_precision IN {PRECISIONS})')

    if _is_postgres():
        op.execute('ALTER TABLE public.family_notes ENABLE ROW LEVEL SECURITY')
        op.execute('ALTER TABLE public.member_details ENABLE ROW LEVEL SECURITY')
        for role in API_ROLES:
            op.execute(
                "DO $$\n"
                "BEGIN\n"
                f"  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN\n"
                f"    REVOKE ALL ON TABLE public.family_notes, public.member_details FROM {role};\n"
                f"    REVOKE ALL ON SEQUENCE public.family_notes_id_seq FROM {role};\n"
                "  END IF;\n"
                "END\n"
                "$$")


def downgrade() -> None:
    _fail_fast_on_locks()

    op.drop_constraint('tag_profiles_died_on_precision_check', 'tag_profiles', type_='check')
    op.drop_constraint('tag_profiles_birth_date_precision_check', 'tag_profiles', type_='check')
    op.drop_column('tag_profiles', 'died_on_precision')
    op.drop_column('tag_profiles', 'died_on')
    op.drop_column('tag_profiles', 'birthplace')
    op.drop_column('tag_profiles', 'birth_date_precision')

    op.drop_table('member_details')

    op.drop_index('ix_family_notes_author_id', table_name='family_notes')
    op.drop_index('ix_family_notes_subject_tag', table_name='family_notes')
    op.drop_index('ix_family_notes_subject_user', table_name='family_notes')
    op.drop_table('family_notes')
