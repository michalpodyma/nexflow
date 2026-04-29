"""Create whatsapp_inbox_events table

Revision ID: 0023
Revises: 0022
Create Date: 2026-04-29
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "whatsapp_inbox_events",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
            nullable=False,
        ),
        sa.Column(
            "candidate_id",
            UUID(as_uuid=True),
            sa.ForeignKey("candidates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("from_phone_masked", sa.String(4), nullable=False),
        sa.Column("message_text", sa.Text, nullable=False),
        sa.Column(
            "received_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("acknowledged_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("paperclip_issue_id", sa.String(64), nullable=True),
    )
    op.create_index("ix_whatsapp_inbox_events_candidate_id", "whatsapp_inbox_events", ["candidate_id"])
    op.create_index("ix_whatsapp_inbox_events_received_at", "whatsapp_inbox_events", ["received_at"])


def downgrade() -> None:
    op.drop_index("ix_whatsapp_inbox_events_received_at", table_name="whatsapp_inbox_events")
    op.drop_index("ix_whatsapp_inbox_events_candidate_id", table_name="whatsapp_inbox_events")
    op.drop_table("whatsapp_inbox_events")
