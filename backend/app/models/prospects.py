from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ProspectSource(str):
    pass


class ProspectStatus(str):
    pass


class Prospect(Base):
    """
    A B2B sales prospect in the business development pipeline.

    Tracks potential clients from initial contact through to conversion.
    """

    __tablename__ = "prospects"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    company_name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    contact_name: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    source: Mapped[str] = mapped_column(
        sa.Enum(
            "referral", "cold_call", "website", "linkedin", "event", "other",
            name="prospect_source_enum",
            create_type=False,
        ),
        nullable=False,
        server_default="other",
    )
    status: Mapped[str] = mapped_column(
        sa.Enum(
            "new", "contacted", "qualified", "proposal_sent", "negotiating", "converted", "lost",
            name="prospect_status_enum",
            create_type=False,
        ),
        nullable=False,
        server_default="new",
    )
    estimated_monthly_value: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(12, 2), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    next_follow_up: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    converted_to_client_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
    )
    assigned_to: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
