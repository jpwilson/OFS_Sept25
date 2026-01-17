"""add_category_2_to_events

Revision ID: b7e2f3c4d5a6
Revises: 6a09c5b9297f
Create Date: 2026-01-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2f3c4d5a6'
down_revision: Union[str, None] = '6a09c5b9297f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('category_2', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('events', 'category_2')
