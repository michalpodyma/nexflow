from datetime import datetime
from decimal import Decimal
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import Currency, PaymentStatus


class Invoice(Base):
    """
    A billing document issued to a client for staffing services.

    Currency rules:
        PLN clients — vat_rate=23, gross = net * 1.23
        EUR clients — vat_rate=0 (reverse charge), gross = net

    period_start / period_end define the staffing period this invoice covers.
    All amounts are stored as NUMERIC(12,2) — never FLOAT.
    """

    __tablename__ = "invoices"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Sequential invoice number, unique across the company (e.g. FV/2026/001)
    invoice_number: Mapped[str] = mapped_column(sa.String(50), unique=True, nullable=False)
    sale_date: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )
    due_date: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )

    # All amounts in the invoice currency (PLN or EUR)
    net_amount: Mapped[Decimal] = mapped_column(sa.Numeric(12, 2), nullable=False)
    vat_amount: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 2), nullable=False, server_default="0.00"
    )
    gross_amount: Mapped[Decimal] = mapped_column(sa.Numeric(12, 2), nullable=False)
    # 0 for EUR reverse-charge, 23 for standard Polish VAT
    vat_rate: Mapped[Decimal] = mapped_column(
        sa.Numeric(5, 2), nullable=False, server_default="0.00"
    )
    currency: Mapped[Currency] = mapped_column(
        sa.Enum(Currency, name="currency_enum", create_type=False),
        nullable=False,
        server_default="PLN",
    )

    payment_status: Mapped[PaymentStatus] = mapped_column(
        sa.Enum(PaymentStatus, name="payment_status", create_type=False),
        nullable=False,
        server_default="pending",
    )

    # Staffing period covered by this invoice
    period_start: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    period_end: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
