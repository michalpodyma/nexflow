from datetime import datetime, time
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Vehicle(Base):
    """
    A company-owned vehicle used to transport workers to client sites.

    Tracks registration, insurance and inspection expiry so coordinators
    get visual warnings before documents lapse.
    """

    __tablename__ = "vehicles"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    make: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    model: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    year: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    license_plate: Mapped[str] = mapped_column(sa.String(20), nullable=False, unique=True)
    capacity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    insurance_expiry_date: Mapped[datetime | None] = mapped_column(
        sa.Date, nullable=True
    )
    inspection_expiry_date: Mapped[datetime | None] = mapped_column(
        sa.Date, nullable=True
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


class TransportRoute(Base):
    """
    A recurring commute route operated by a vehicle, optionally driven by a worker.

    Workers are assigned to routes via TransportAssignment.
    """

    __tablename__ = "transport_routes"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    origin: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    destination: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    vehicle_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    driver_worker_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("workers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    departure_time: Mapped[time | None] = mapped_column(sa.Time, nullable=True)
    return_time: Mapped[time | None] = mapped_column(sa.Time, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.true()
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )


class TransportAssignment(Base):
    """Links a worker to a transport route for a specific period."""

    __tablename__ = "transport_assignments"

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
    route_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("transport_routes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_date: Mapped[datetime] = mapped_column(sa.Date, nullable=False)
    end_date: Mapped[datetime | None] = mapped_column(sa.Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
