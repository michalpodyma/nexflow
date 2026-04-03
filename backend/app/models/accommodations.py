from datetime import datetime
from decimal import Decimal
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Accommodation(Base):
    """
    A company-managed property used to house temporary workers.

    Tracks capacity, occupancy, and cost data so coordinators can manage
    housing assignments and plan accommodation budgets.
    """

    __tablename__ = "accommodations"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    total_capacity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    rooms_count: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    monthly_rent: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(10, 2), nullable=True
    )
    monthly_utilities: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(10, 2), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.true()
    )
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )


class AccommodationAssignment(Base):
    """
    Links a worker to an accommodation for a specific period.

    move_out_date = NULL means the worker is currently living there.
    monthly_cost_to_worker tracks what the worker contributes (may be 0).
    """

    __tablename__ = "accommodation_assignments"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    worker_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("workers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    accommodation_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("accommodations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room_number: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    move_in_date: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )
    move_out_date: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    monthly_cost_to_worker: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(10, 2), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
