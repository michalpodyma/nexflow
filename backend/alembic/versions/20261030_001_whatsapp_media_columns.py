"""add media columns to whatsapp_inbox_events (EUR-3943)

Revision ID: 20261030_001
Revises: 20260509_001
Create Date: 2026-10-30
"""

import sqlalchemy as sa

from alembic import op

revision = "20261030_001"
down_revision = "20260509_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "whatsapp_inbox_events",
        sa.Column("message_type", sa.String(30), nullable=False, server_default="text"),
    )
    op.add_column(
        "whatsapp_inbox_events",
        sa.Column("media_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "whatsapp_inbox_events",
        sa.Column("mime_type", sa.String(128), nullable=True),
    )
    op.add_column(
        "whatsapp_inbox_events",
        sa.Column("media_filename", sa.String(512), nullable=True),
    )
    op.add_column(
        "whatsapp_inbox_events",
        sa.Column("media_caption", sa.Text, nullable=True),
    )
    op.add_column(
        "whatsapp_inbox_events",
        sa.Column("media_sha256", sa.String(64), nullable=True),
    )
    op.add_column(
        "whatsapp_inbox_events",
        sa.Column("media_b2_key", sa.String(512), nullable=True),
    )
    # Allow message_text to be NULL for media-only rows (existing rows keep their value)
    op.alter_column("whatsapp_inbox_events", "message_text", nullable=True)


def downgrade() -> None:
    op.alter_column("whatsapp_inbox_events", "message_text", nullable=False)
    op.drop_column("whatsapp_inbox_events", "media_b2_key")
    op.drop_column("whatsapp_inbox_events", "media_sha256")
    op.drop_column("whatsapp_inbox_events", "media_caption")
    op.drop_column("whatsapp_inbox_events", "media_filename")
    op.drop_column("whatsapp_inbox_events", "mime_type")
    op.drop_column("whatsapp_inbox_events", "media_id")
    op.drop_column("whatsapp_inbox_events", "message_type")
