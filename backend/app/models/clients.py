from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import Currency


class Client(Base):
    """
    A client company that places staffing orders with Eurojob-West.

    Currency rules:
        PLN — Polish clients billed with 23% VAT (standard PL regime).
        EUR — DE/EU clients billed with 0% VAT (reverse charge, NIP/VAT-EU required).
    """

    __tablename__ = "clients"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    company_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    # Polish VAT ID (NIP) — 10-digit number, unique business identifier for PL clients
    nip: Mapped[str | None] = mapped_column(sa.String(20), unique=True, nullable=True)
    # EU VAT number for DE/EU reverse-charge invoicing (e.g. DE123456789)
    vat_eu: Mapped[str | None] = mapped_column(sa.String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(sa.String(20), nullable=True)
    # ISO 3166-1 alpha-2 (PL, DE, NL, …)
    country: Mapped[str | None] = mapped_column(sa.String(2), nullable=True)
    phone: Mapped[str | None] = mapped_column(sa.String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    account_manager_name: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    # Invoice due date = sale_date + payment_terms_days
    payment_terms_days: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, server_default="30"
    )
    currency: Mapped[Currency] = mapped_column(
        sa.Enum(Currency, name="currency_enum", create_type=False),
        nullable=False,
        server_default="PLN",
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
