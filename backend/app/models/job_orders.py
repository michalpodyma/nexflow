from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import Currency, JobOrderStatus, JobOrderUrgency


class JobOrder(Base):
    """
    A staffing order placed by a client company.

    Tracks headcount requirements, urgency, and pipeline status from open
    through to filled or cancelled.
    """

    __tablename__ = "job_orders"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    location: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    headcount_needed: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="1")
    headcount_filled: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    urgency: Mapped[JobOrderUrgency] = mapped_column(
        sa.Enum(JobOrderUrgency, name="job_order_urgency", create_type=False),
        nullable=False,
        server_default="normal",
    )
    status: Mapped[JobOrderStatus] = mapped_column(
        sa.Enum(JobOrderStatus, name="job_order_status", create_type=False),
        nullable=False,
        server_default="open",
        index=True,
    )
    deadline: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    salary_min: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(10, 2), nullable=True
    )
    salary_max: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(10, 2), nullable=True
    )
    currency: Mapped[Currency] = mapped_column(
        sa.Enum(Currency, name="currency_enum", create_type=False),
        nullable=False,
        server_default="PLN",
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
