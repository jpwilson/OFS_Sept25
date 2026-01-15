"""add_reaction_type_to_media_likes

Revision ID: 6a09c5b9297f
Revises: 877cc9ab0a0b
Create Date: 2026-01-15 13:02:44.654357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a09c5b9297f'
down_revision: Union[str, None] = '877cc9ab0a0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('media_likes', sa.Column('reaction_type', sa.String(20), nullable=False, server_default='heart'))


def downgrade() -> None:
    op.drop_column('media_likes', 'reaction_type')
