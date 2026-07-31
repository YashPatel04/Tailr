"""provider keys and live models

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-07-29 00:00:00.000000

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "f2a3b4c5d6e7"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Add user preference columns
    op.add_column("users", sa.Column("default_temperature", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("default_max_tokens", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("default_top_p", sa.Float(), nullable=True))

    # Set defaults for existing users
    op.execute("UPDATE users SET default_temperature = 0.7 WHERE default_temperature IS NULL")
    op.execute("UPDATE users SET default_max_tokens = 4096 WHERE default_max_tokens IS NULL")
    op.execute("UPDATE users SET default_top_p = 1.0 WHERE default_top_p IS NULL")

    # Step 2: Add model tracking columns to chat_messages
    op.add_column(
        "chat_messages",
        sa.Column("llm_provider_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("chat_messages", sa.Column("model", sa.String(128), nullable=True))
    op.create_foreign_key(
        "chat_messages_llm_provider_id_fkey",
        "chat_messages",
        "llm_providers",
        ["llm_provider_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Step 3: Backfill existing chat_messages with provider/model from their session
    op.execute(
        """
        UPDATE chat_messages cm
        SET llm_provider_id = s.llm_provider_id,
            model = lp.model
        FROM sessions s
        JOIN llm_providers lp ON lp.id = s.llm_provider_id
        WHERE cm.session_id = s.id
          AND s.llm_provider_id IS NOT NULL
          AND cm.role = 'assistant'
        """
    )

    # Step 4: Drop columns from llm_providers
    op.drop_column("llm_providers", "model")
    op.drop_column("llm_providers", "temperature")
    op.drop_column("llm_providers", "top_p")
    op.drop_column("llm_providers", "max_tokens")
    op.drop_column("llm_providers", "is_default")

    # Step 5: Drop llm_provider_id from sessions
    op.drop_constraint("sessions_llm_provider_id_fkey", "sessions", type_="foreignkey")
    op.drop_column("sessions", "llm_provider_id")


def downgrade() -> None:
    # Restore sessions.llm_provider_id
    op.add_column(
        "sessions",
        sa.Column("llm_provider_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "sessions_llm_provider_id_fkey",
        "sessions",
        "llm_providers",
        ["llm_provider_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Restore llm_providers columns
    op.add_column("llm_providers", sa.Column("is_default", sa.Boolean(), nullable=True))
    op.add_column("llm_providers", sa.Column("max_tokens", sa.Integer(), nullable=True))
    op.add_column("llm_providers", sa.Column("top_p", sa.Float(), nullable=True))
    op.add_column("llm_providers", sa.Column("temperature", sa.Float(), nullable=True))
    op.add_column("llm_providers", sa.Column("model", sa.String(128), nullable=True))

    op.execute(
        "UPDATE llm_providers SET is_default = false, max_tokens = 4096, top_p = 1.0, temperature = 0.7, model = 'gpt-4o'"
    )

    # Drop chat_messages columns
    op.drop_constraint("chat_messages_llm_provider_id_fkey", "chat_messages", type_="foreignkey")
    op.drop_column("chat_messages", "model")
    op.drop_column("chat_messages", "llm_provider_id")

    # Drop user preference columns
    op.drop_column("users", "default_top_p")
    op.drop_column("users", "default_max_tokens")
    op.drop_column("users", "default_temperature")
