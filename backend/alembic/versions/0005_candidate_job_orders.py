"""Add candidate_job_orders junction table

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-03

Creates the candidate_job_orders table linking candidates to job orders with
submission pipeline status tracking.
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # No explicit DO block — let SQLAlchemy's visit_enum create the type via its
    # memo system as part of op.create_table. Using DO block + create_type=False
    # breaks because visit_enum ignores create_type when checkfirst=False.
    op.create_table(
        "candidate_job_orders",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "candidate_id",
            UUID(as_uuid=True),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_order_id",
            UUID(as_uuid=True),
            sa.ForeignKey("job_orders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "submitted", "interviewing", "offered", "placed", "rejected",
                name="candidate_job_order_status",
            ),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column(
            "submitted_at",
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
        sa.UniqueConstraint("candidate_id", "job_order_id", name="uq_candidate_job_order"),
    )

    op.create_index("ix_cjo_candidate_id", "candidate_job_orders", ["candidate_id"])
    op.create_index("ix_cjo_job_order_id", "candidate_job_orders", ["job_order_id"])
    op.create_index("ix_cjo_status", "candidate_job_orders", ["status"])


def downgrade() -> None:
    op.drop_index("ix_cjo_status", "candidate_job_orders")
    op.drop_index("ix_cjo_job_order_id", "candidate_job_orders")
    op.drop_index("ix_cjo_candidate_id", "candidate_job_orders")
    op.drop_table("candidate_job_orders")
    op.execute("DROP TYPE IF EXISTS candidate_job_order_status")
