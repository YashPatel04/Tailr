"""add session current model

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-07-29 01:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "a3b4c5d6e7f8"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("current_provider_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("sessions", sa.Column("current_model", sa.String(128), nullable=True))
    op.create_foreign_key(
        "sessions_current_provider_id_fkey",
        "sessions",
        "llm_providers",
        ["current_provider_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("sessions_current_provider_id_fkey", "sessions", type_="foreignkey")
    op.drop_column("sessions", "current_model")
    op.drop_column("sessions", "current_provider_id")
