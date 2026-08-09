"""drop pending_diff_json from sessions

Revision ID: a1b2c3d4e5f6
Revises: d8e9f0a1b2c3
Create Date: 2026-08-01 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "d8e9f0a1b2c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("sessions", "pending_diff_json")


def downgrade() -> None:
    import sqlalchemy as sa
    from sqlalchemy.dialects import postgresql

    op.add_column(
        "sessions",
        sa.Column("pending_diff_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
