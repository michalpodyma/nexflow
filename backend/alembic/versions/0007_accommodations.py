"""Add accommodations and accommodation_assignments tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-03

Adds:
  - accommodations — property records with capacity and cost data
  - accommodation_assignments — worker ↔ accommodation assignments with move-in/out tracking
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PGUUID

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "accommodations",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("total_capacity", sa.Integer, nullable=False),
        sa.Column("rooms_count", sa.Integer, nullable=True),
        sa.Column("monthly_rent", sa.Numeric(10, 2), nullable=True),
        sa.Column("monthly_utilities", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "is_active", sa.Boolean, nullable=False, server_default=sa.true()
        ),
        sa.Column("notes", sa.Text, nullable=True),
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
    op.create_index("ix_accommodations_city", "accommodations", ["city"])

    op.create_table(
        "accommodation_assignments",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "worker_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "accommodation_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("accommodations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("room_number", sa.String(50), nullable=True),
        sa.Column("move_in_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("move_out_date", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("monthly_cost_to_worker", sa.Numeric(10, 2), nullable=True),
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
    op.create_index(
        "ix_accommodation_assignments_worker_id",
        "accommodation_assignments",
        ["worker_id"],
    )
    op.create_index(
        "ix_accommodation_assignments_accommodation_id",
        "accommodation_assignments",
        ["accommodation_id"],
    )


def downgrade() -> None:
    op.drop_table("accommodation_assignments")
    op.drop_table("accommodations")
