"""Add job_orders table

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-03

Creates the job_orders table with urgency/status enums for client staffing requests.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE job_order_urgency AS ENUM ('normal', 'urgent', 'critical');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE job_order_status AS ENUM (
                'open', 'sourcing', 'submitted', 'interview',
                'filled', 'on_hold', 'cancelled'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.create_table(
        "job_orders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("headcount_needed", sa.Integer, nullable=False, server_default="1"),
        sa.Column("headcount_filled", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "urgency",
            sa.Enum("normal", "urgent", "critical", name="job_order_urgency", create_type=False),
            nullable=False,
            server_default="normal",
        ),
        sa.Column(
            "status",
            sa.Enum(
                "open", "sourcing", "submitted", "interview", "filled", "on_hold", "cancelled",
                name="job_order_status",
                create_type=False,
            ),
            nullable=False,
            server_default="open",
        ),
        sa.Column("deadline", sa.Date, nullable=True),
        sa.Column("salary_min", sa.Numeric(10, 2), nullable=True),
        sa.Column("salary_max", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "currency",
            sa.Enum("PLN", "EUR", name="currency_enum", create_type=False),
            nullable=False,
            server_default="PLN",
        ),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_job_orders_client_id", "job_orders", ["client_id"])
    op.create_index("ix_job_orders_status", "job_orders", ["status"])


def downgrade() -> None:
    op.drop_index("ix_job_orders_status", "job_orders")
    op.drop_index("ix_job_orders_client_id", "job_orders")
    op.drop_table("job_orders")
    op.execute("DROP TYPE IF EXISTS job_order_status")
    op.execute("DROP TYPE IF EXISTS job_order_urgency")
