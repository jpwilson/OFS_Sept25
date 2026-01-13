"""add_theme_preference

Revision ID: 877cc9ab0a0b
Revises: a3ad04689449
Create Date: 2026-01-13 17:46:09.873850

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '877cc9ab0a0b'
down_revision: Union[str, None] = 'a3ad04689449'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add theme_preference column to users table
    op.add_column('users', sa.Column('theme_preference', sa.String(length=10), nullable=True))


def downgrade() -> None:
    # Remove theme_preference column from users table
    op.drop_column('users', 'theme_preference')
