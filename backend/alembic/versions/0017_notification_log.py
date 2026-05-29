"""Notification log table — audit trail for email/SMS dispatch

Revision ID: 0017
Revises: 0016
Create Date: 2026-04-05
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification_logs",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        # Short type name: welcome_candidate, compliance_expiry, contract_expiry,
        # invoice_sent, invoice_overdue
        sa.Column("notification_type", sa.String(60), nullable=False),
        # 'email' or 'sms'
        sa.Column("channel", sa.String(10), nullable=False),
        # E.164 phone or email address
        sa.Column("recipient", sa.String(255), nullable=False),
        # Optional soft reference to the triggering entity
        sa.Column("subject_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("subject_type", sa.String(30), nullable=True),
        # 'sent' or 'failed'
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    # Index for querying delivery history by entity
    op.create_index(
        "ix_notification_logs_subject",
        "notification_logs",
        ["subject_type", "subject_id"],
    )
    op.create_index(
        "ix_notification_logs_created_at",
        "notification_logs",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notification_logs_created_at", table_name="notification_logs")
    op.drop_index("ix_notification_logs_subject", table_name="notification_logs")
    op.drop_table("notification_logs")
