"""add_is_demo_showcase_to_events

Revision ID: 854619b0e93a
Revises: 5169e6e27cb2
Create Date: 2026-03-05 23:38:03.973211

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '854619b0e93a'
down_revision: Union[str, None] = '5169e6e27cb2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('is_demo_showcase', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('events', 'is_demo_showcase')
