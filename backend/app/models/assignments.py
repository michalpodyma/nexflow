from datetime import datetime
from decimal import Decimal
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Assignment(Base):
    """
    A worker deployed to a client site for a specific position.

    All monetary amounts are in PLN (Polish Złoty), stored as NUMERIC(12,2).
    Rate history is tracked in AssignmentRate — do not update rates on this
    record directly; insert a new AssignmentRate row with the effective_date instead.

    is_active=True means the worker is currently deployed.
    end_date=None means the assignment is open-ended.
    """

    __tablename__ = "assignments"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    worker_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("workers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
    )
    position: Mapped[str] = mapped_column(sa.String(255), nullable=False)

    # Current rates (PLN netto). Historical rates tracked in assignment_rates.
    employer_rate: Mapped[Decimal] = mapped_column(sa.Numeric(12, 2), nullable=False)
    worker_rate: Mapped[Decimal] = mapped_column(sa.Numeric(12, 2), nullable=False)
    # Cost components billed separately on top of the worker rate
    bhp_cost: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 2), nullable=False, server_default="0.00"
    )
    accommodation_cost: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 2), nullable=False, server_default="0.00"
    )
    transport_cost: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 2), nullable=False, server_default="0.00"
    )

    start_date: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )
    # NULL = open-ended assignment
    end_date: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.true()
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )


class AssignmentRate(Base):
    """
    Immutable rate history for an assignment.

    Each row records the rates in effect from effective_date onward. To change rates,
    INSERT a new row — never UPDATE an existing one. The current rate is the row with
    the latest effective_date <= today for a given assignment_id.
    """

    __tablename__ = "assignment_rates"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    assignment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=False,
    )
    effective_date: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )
    employer_rate: Mapped[Decimal] = mapped_column(sa.Numeric(12, 2), nullable=False)
    worker_rate: Mapped[Decimal] = mapped_column(sa.Numeric(12, 2), nullable=False)
    bhp_cost: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 2), nullable=False, server_default="0.00"
    )
    accommodation_cost: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 2), nullable=False, server_default="0.00"
    )
    transport_cost: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 2), nullable=False, server_default="0.00"
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
