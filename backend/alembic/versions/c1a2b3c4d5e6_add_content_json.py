"""add content_json to master_resumes

Revision ID: c1a2b3c4d5e6
Revises: 1b575b88483a
Create Date: 2026-07-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1a2b3c4d5e6'
down_revision: Union[str, None] = '1b575b88483a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('master_resumes', sa.Column('content_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('session_documents', sa.Column('content_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('session_documents', 'content_json')
    op.drop_column('master_resumes', 'content_json')
