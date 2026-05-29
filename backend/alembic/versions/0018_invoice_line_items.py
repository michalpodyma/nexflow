"""Invoice line items table — per-worker billing detail rows

Revision ID: 0018
Revises: 0017
Create Date: 2026-04-05
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "invoice_line_items",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "invoice_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("invoices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Optional links — nullable because an item may represent costs without
        # a matched worker (e.g. manual line items added later).
        sa.Column("worker_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("assignment_id", PGUUID(as_uuid=True), nullable=True),
        # Human-readable description for the PDF
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("hours_worked", sa.Numeric(8, 2), nullable=True),
        sa.Column("unit_rate", sa.Numeric(12, 2), nullable=True),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("period_start", sa.Date, nullable=True),
        sa.Column("period_end", sa.Date, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_invoice_line_items_invoice_id",
        "invoice_line_items",
        ["invoice_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_invoice_line_items_invoice_id", table_name="invoice_line_items")
    op.drop_table("invoice_line_items")
