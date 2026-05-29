"""Add worker_files table for per-worker document uploads

Revision ID: 0012
Revises: 0011
Create Date: 2026-04-04
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "worker_files",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
            nullable=False,
        ),
        sa.Column(
            "worker_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column(
            "content_type",
            sa.String(200),
            nullable=False,
            server_default="application/octet-stream",
        ),
        sa.Column("file_size", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("storage_key", sa.String(1000), nullable=False),
        sa.Column("document_type", sa.String(100), nullable=True),
        sa.Column("uploaded_by_user", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_worker_files_worker_id", "worker_files", ["worker_id"])


def downgrade() -> None:
    op.drop_index("ix_worker_files_worker_id", table_name="worker_files")
    op.drop_table("worker_files")
