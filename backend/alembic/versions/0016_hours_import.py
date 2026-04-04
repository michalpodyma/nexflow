"""Spreadsheet hours import — hours_import_batches, client_column_mappings, worker_hours tables

Revision ID: 0016
Revises: 0015
Create Date: 2026-04-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create PostgreSQL enum types
    op.execute(
        "CREATE TYPE import_batch_status AS ENUM "
        "('pending', 'mapped', 'validated', 'imported', 'failed')"
    )
    op.execute(
        "CREATE TYPE hours_match_status AS ENUM "
        "('matched', 'unmatched', 'flagged')"
    )

    # hours_import_batches — one row per file upload
    op.create_table(
        "hours_import_batches",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "client_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("storage_key", sa.String(1000), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.BigInteger, nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "mapped", "validated", "imported", "failed",
                    name="import_batch_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("raw_headers", JSONB, nullable=True),  # detected column headers
        sa.Column("row_count", sa.Integer, nullable=True),
        sa.Column("matched_count", sa.Integer, nullable=True),
        sa.Column("unmatched_count", sa.Integer, nullable=True),
        sa.Column("flagged_count", sa.Integer, nullable=True),
        sa.Column("uploaded_by_user", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # client_column_mappings — saved header→field mappings per client
    op.create_table(
        "client_column_mappings",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "client_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("spreadsheet_header", sa.String(255), nullable=False),
        sa.Column("internal_field", sa.String(100), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        # One mapping per (client, internal_field)
        sa.UniqueConstraint("client_id", "internal_field", name="uq_client_column_mapping"),
    )

    # worker_hours — one row per imported work-hours record
    op.create_table(
        "worker_hours",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "batch_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("hours_import_batches.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "worker_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "assignment_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("assignments.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("row_index", sa.Integer, nullable=False),  # 0-based row number in spreadsheet
        sa.Column("raw_worker_name", sa.String(500), nullable=True),
        sa.Column("work_date", sa.Date, nullable=True),
        sa.Column("hours_worked", sa.Numeric(5, 2), nullable=True),
        sa.Column("overtime_hours", sa.Numeric(5, 2), nullable=True),
        sa.Column("absence_type", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "match_status",
            sa.Enum("matched", "unmatched", "flagged", name="hours_match_status", create_type=False),
            nullable=False,
            server_default="unmatched",
        ),
        sa.Column("validation_errors", JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("worker_hours")
    op.drop_table("client_column_mappings")
    op.drop_table("hours_import_batches")
    op.execute("DROP TYPE IF EXISTS hours_match_status")
    op.execute("DROP TYPE IF EXISTS import_batch_status")
