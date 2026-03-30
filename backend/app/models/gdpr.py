from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import GdprSubjectType


class GdprConsent(Base):
    """
    Immutable audit log of all GDPR consent events (grants and withdrawals).

    Write-only — never UPDATE rows in this table. Each change to a subject's
    consent state should INSERT a new row. The current effective consent is
    the most recent row for (subject_type, subject_id, consent_type).

    consent_type examples:
        "recruitment_processing"  — processing for recruitment purposes
        "marketing"               — optional marketing communications
        "data_transfer_eu"        — transfer to EU entities

    ip_address should be captured from the HTTP request at the point of consent.
    Store in the canonical IPv4/IPv6 text form.
    """

    __tablename__ = "gdpr_consents"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    # Which entity table this consent belongs to
    subject_type: Mapped[GdprSubjectType] = mapped_column(
        sa.Enum(GdprSubjectType, name="gdpr_subject_type", create_type=False),
        nullable=False,
    )
    # UUID of the worker or candidate record
    subject_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    # Logical category of consent (see docstring for examples)
    consent_type: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    # True = consent granted, False = consent withdrawn
    granted: Mapped[bool] = mapped_column(sa.Boolean, nullable=False)
    # IP address of the client at the time of consent capture
    ip_address: Mapped[str | None] = mapped_column(sa.String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
