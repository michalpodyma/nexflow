"""Add worker assignment snapshot and expiry fields

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-03

Adds:
  - safety_cert_expiry   — BHP certificate expiry date
  - current_client_id    — FK to clients, denormalised current placement
  - assignment_start_date — start of current placement
  - assignment_end_date   — planned end of current placement
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workers",
        sa.Column("safety_cert_expiry", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "workers",
        sa.Column(
            "current_client_id",
            UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "workers",
        sa.Column("assignment_start_date", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "workers",
        sa.Column("assignment_end_date", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_workers_current_client_id", "workers", ["current_client_id"])


def downgrade() -> None:
    op.drop_index("ix_workers_current_client_id", "workers")
    op.drop_column("workers", "assignment_end_date")
    op.drop_column("workers", "assignment_start_date")
    op.drop_column("workers", "current_client_id")
    op.drop_column("workers", "safety_cert_expiry")
