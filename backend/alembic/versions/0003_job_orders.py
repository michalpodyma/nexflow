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
    # Use raw SQL for both enum creation and table creation to bypass SQLAlchemy's
    # DDLGenerator.visit_enum, which re-emits CREATE TYPE regardless of create_type=False
    # when checkfirst=False (Alembic's default). This is a SQLAlchemy 2.x bug/behaviour
    # where create_type=False only guards direct enum.create() calls, not table-level DDL.
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
    op.execute("""
        CREATE TABLE IF NOT EXISTS job_orders (
            id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
            title       VARCHAR(255) NOT NULL,
            description TEXT,
            location    VARCHAR(255),
            headcount_needed  INTEGER NOT NULL DEFAULT 1,
            headcount_filled  INTEGER NOT NULL DEFAULT 0,
            urgency     job_order_urgency NOT NULL DEFAULT 'normal',
            status      job_order_status  NOT NULL DEFAULT 'open',
            deadline    DATE,
            salary_min  NUMERIC(10, 2),
            salary_max  NUMERIC(10, 2),
            currency    currency_enum NOT NULL DEFAULT 'PLN',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.create_index("ix_job_orders_client_id", "job_orders", ["client_id"])
    op.create_index("ix_job_orders_status", "job_orders", ["status"])


def downgrade() -> None:
    op.drop_index("ix_job_orders_status", "job_orders")
    op.drop_index("ix_job_orders_client_id", "job_orders")
    op.drop_table("job_orders")
    op.execute("DROP TYPE IF EXISTS job_order_status")
    op.execute("DROP TYPE IF EXISTS job_order_urgency")
