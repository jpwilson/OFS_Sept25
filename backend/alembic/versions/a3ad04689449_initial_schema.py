"""initial_schema

Revision ID: a3ad04689449
Revises:
Create Date: 2026-01-13 16:15:59.840970

This is the baseline migration representing the existing database schema.
The database was created manually before Alembic was set up, so this migration
is empty and has been stamped as applied.

All future migrations should build on this baseline.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3ad04689449'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline migration - database already exists
    # This migration was stamped as applied to establish Alembic tracking
    pass


def downgrade() -> None:
    # Cannot downgrade from baseline
    pass
