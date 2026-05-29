"""Add vehicles, transport_routes, and transport_assignments tables

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-03

Adds:
  - vehicles — company fleet with insurance/inspection expiry tracking
  - transport_routes — named commute routes with vehicle and driver assignments
  - transport_assignments — worker ↔ route assignments with date ranges
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vehicles",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("year", sa.Integer, nullable=True),
        sa.Column("license_plate", sa.String(20), nullable=False, unique=True),
        sa.Column("capacity", sa.Integer, nullable=False),
        sa.Column("insurance_expiry_date", sa.Date, nullable=True),
        sa.Column("inspection_expiry_date", sa.Date, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
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

    op.create_table(
        "transport_routes",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("origin", sa.String(255), nullable=False),
        sa.Column("destination", sa.String(255), nullable=False),
        sa.Column(
            "vehicle_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("vehicles.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "driver_worker_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("departure_time", sa.Time, nullable=True),
        sa.Column("return_time", sa.Time, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
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
    op.create_index("ix_transport_routes_vehicle_id", "transport_routes", ["vehicle_id"])
    op.create_index(
        "ix_transport_routes_driver_worker_id", "transport_routes", ["driver_worker_id"]
    )

    op.create_table(
        "transport_assignments",
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
            "route_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("transport_routes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=True),
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
        "ix_transport_assignments_worker_id", "transport_assignments", ["worker_id"]
    )
    op.create_index(
        "ix_transport_assignments_route_id", "transport_assignments", ["route_id"]
    )


def downgrade() -> None:
    op.drop_table("transport_assignments")
    op.drop_table("transport_routes")
    op.drop_table("vehicles")
