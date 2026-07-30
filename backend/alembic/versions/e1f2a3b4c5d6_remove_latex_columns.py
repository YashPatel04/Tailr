"""remove latex columns

Revision ID: e1f2a3b4c5d6
Revises: d7e8f9a0b1c2
Create Date: 2026-07-22 23:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "e1f2a3b4c5d6"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop columns from master_resumes
    op.drop_column("master_resumes", "tex_source")
    op.drop_column("master_resumes", "vocabulary_map_json")

    # Drop columns from session_documents
    op.drop_column("session_documents", "tex_source")
    op.drop_column("session_documents", "document_model_json")

    # Make content_json NOT NULL on master_resumes
    op.alter_column(
        "master_resumes",
        "content_json",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
    )

    # Make content_json NOT NULL on session_documents
    op.alter_column(
        "session_documents",
        "content_json",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
    )


def downgrade() -> None:
    # Make content_json nullable again
    op.alter_column(
        "master_resumes",
        "content_json",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
    )
    op.alter_column(
        "session_documents",
        "content_json",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
    )

    # Add columns back
    op.add_column("master_resumes", sa.Column("tex_source", sa.Text(), nullable=True))
    op.add_column(
        "master_resumes",
        sa.Column("vocabulary_map_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("session_documents", sa.Column("tex_source", sa.Text(), nullable=True))
    op.add_column(
        "session_documents",
        sa.Column("document_model_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
