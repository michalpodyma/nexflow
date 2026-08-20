"""add elevenlabs_conversations table (EUR-1575)

Revision ID: 20260820_001
Revises: 20260509_001
Create Date: 2026-08-20
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "20260820_001"
down_revision = "20260509_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN CREATE TYPE conversation_intent_enum AS ENUM "
        "('candidate_application','client_inquiry','other'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE hrappka_sync_status_enum AS ENUM "
        "('pending','synced','failed','skipped'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )

    op.create_table(
        "elevenlabs_conversations",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column("wa_phone_number", sa.String(30), nullable=True),
        sa.Column("agent_id", sa.String(128), nullable=True),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("ended_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("transcript_json", JSONB, nullable=True),
        sa.Column("summary_text", sa.Text, nullable=True),
        sa.Column("evaluation_results_json", JSONB, nullable=True),
        sa.Column(
            "intent",
            sa.Enum(
                "candidate_application",
                "client_inquiry",
                "other",
                name="conversation_intent_enum",
                create_type=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "hrappka_sync_status",
            sa.Enum(
                "pending",
                "synced",
                "failed",
                "skipped",
                name="hrappka_sync_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("hrappka_target_id", sa.String(64), nullable=True),
        sa.Column("hrappka_sync_error", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_elevenlabs_conversations_intent",
        "elevenlabs_conversations",
        ["intent"],
    )
    op.create_index(
        "ix_elevenlabs_conversations_hrappka_sync_status",
        "elevenlabs_conversations",
        ["hrappka_sync_status"],
    )
    op.create_index(
        "ix_elevenlabs_conversations_wa_phone_number",
        "elevenlabs_conversations",
        ["wa_phone_number"],
    )


def downgrade() -> None:
    op.drop_index("ix_elevenlabs_conversations_wa_phone_number", "elevenlabs_conversations")
    op.drop_index("ix_elevenlabs_conversations_hrappka_sync_status", "elevenlabs_conversations")
    op.drop_index("ix_elevenlabs_conversations_intent", "elevenlabs_conversations")
    op.drop_table("elevenlabs_conversations")
    op.execute("DROP TYPE IF EXISTS conversation_intent_enum")
    op.execute("DROP TYPE IF EXISTS hrappka_sync_status_enum")
