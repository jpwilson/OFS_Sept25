"""add_ai_usage_log_table

Revision ID: 596794edef84
Revises: b7e2f3c4d5a6
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '596794edef84'
down_revision: Union[str, None] = 'b7e2f3c4d5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('ai_usage_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_usage_log_id'), 'ai_usage_log', ['id'], unique=False)
    op.create_index(op.f('ix_ai_usage_log_user_id'), 'ai_usage_log', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_usage_log_user_id'), table_name='ai_usage_log')
    op.drop_index(op.f('ix_ai_usage_log_id'), table_name='ai_usage_log')
    op.drop_table('ai_usage_log')
