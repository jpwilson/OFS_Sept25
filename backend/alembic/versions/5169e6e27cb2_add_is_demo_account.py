"""add_is_demo_account

Revision ID: 5169e6e27cb2
Revises: 596794edef84
Create Date: 2026-03-05 15:08:20.705166

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5169e6e27cb2'
down_revision: Union[str, None] = '596794edef84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_demo_account', sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'is_demo_account')
