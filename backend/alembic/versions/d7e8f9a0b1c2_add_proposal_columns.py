"""add pending_proposal columns to sessions

Revision ID: d7e8f9a0b1c2
Revises: c1a2b3c4d5e6
Create Date: 2026-07-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, None] = 'c1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sessions', sa.Column('pending_operations_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('sessions', sa.Column('pending_diff_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('sessions', 'pending_diff_json')
    op.drop_column('sessions', 'pending_operations_json')
