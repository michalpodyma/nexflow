from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import PreferredPosition, ScreeningStatus


class Candidate(Base):
    """
    A job applicant entering the recruitment pipeline via WhatsApp chatbot or web form.

    This is a greenfield entity — no prior system. The platform intake form is the
    only ingestion point for Phase 1.

    Document storage:
        id_doc_url and health_cert_url are Backblaze B2 object keys (not full URLs).
        Resolve to signed URLs at read time using the B2 client.

    GDPR retention:
        gdpr_delete_at is auto-set to (created_at + 12 months) by a DB trigger at
        INSERT time. When screening_status transitions to 'hired', the application
        must clear gdpr_delete_at (no automatic deletion for active employees).

    languages field (JSONB array example):
        ["pl", "en", "uk"]  — ISO 639-1 language codes
    """

    __tablename__ = "candidates"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    first_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(sa.String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    # ISO 3166-1 alpha-2
    nationality: Mapped[str | None] = mapped_column(sa.String(2), nullable=True)
    availability_from: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    preferred_position: Mapped[PreferredPosition | None] = mapped_column(
        sa.Enum(PreferredPosition, name="preferred_position", create_type=False),
        nullable=True,
    )
    # ISO 639-1 language codes — e.g. ["pl", "en", "uk"]
    languages: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    location_preference: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)

    screening_status: Mapped[ScreeningStatus] = mapped_column(
        sa.Enum(ScreeningStatus, name="screening_status", create_type=False),
        nullable=False,
        server_default="new",
    )
    # Composite score produced by the chatbot screening (0–100)
    screening_score: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    # FK to chatbot_sessions.id — set once screening session is initiated
    chatbot_session_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), nullable=True
    )

    # Backblaze B2 object keys (not signed URLs — resolve at read time)
    id_doc_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    health_cert_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    # GDPR consent — must be captured at intake
    gdpr_consent: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.false()
    )
    gdpr_consent_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    # Auto-set to (created_at + 12 months) by the candidates_gdpr_delete_at_trigger.
    # Clear when screening_status = 'hired'.
    gdpr_delete_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
