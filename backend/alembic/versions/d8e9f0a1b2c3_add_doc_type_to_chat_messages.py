"""add doc_type to chat_messages

Revision ID: d8e9f0a1b2c3
Revises: c7c4776d50fc
Create Date: 2026-07-31 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d8e9f0a1b2c3"
down_revision: str | None = "c7c4776d50fc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "chat_messages",
        sa.Column("doc_type", sa.String(20), nullable=False, server_default="resume"),
    )
    op.create_index(
        "ix_chat_messages_session_doc_type",
        "chat_messages",
        ["session_id", "doc_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_chat_messages_session_doc_type", table_name="chat_messages")
    op.drop_column("chat_messages", "doc_type")
