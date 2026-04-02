from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import AttendanceStatus, WorkPermitType

# Forward-ref note: current_client_id references clients.id — defined in clients.py


class Worker(Base):
    """
    A placed temporary worker employed via Eurojob-West.

    Encrypted fields (Phase 1 placeholder, Phase 2 → KMS):
        pesel          — Polish national ID (PESEL), 11-digit, special-category PII.
        passport_number — Passport number for non-EU workers.

    GDPR retention:
        gdpr_delete_at is auto-set to (created_at + 12 months) by a DB trigger at
        INSERT time. The application must clear or extend this field when the worker
        transitions to active/hired status. Do NOT delete records where is_active=true
        regardless of gdpr_delete_at.

    See: app/crypto.py for encrypt_field / decrypt_field helpers.
    """

    __tablename__ = "workers"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    first_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    date_of_birth: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    # ISO 3166-1 alpha-2 nationality (PL, UA, BY, …)
    nationality: Mapped[str | None] = mapped_column(sa.String(2), nullable=True)
    phone: Mapped[str | None] = mapped_column(sa.String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)

    # GDPR special-category PII — stored encrypted via app/crypto.py
    # Phase 2: replace encrypt_field/decrypt_field with AWS KMS calls
    pesel: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    passport_number: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    work_permit_type: Mapped[WorkPermitType | None] = mapped_column(
        sa.Enum(WorkPermitType, name="work_permit_type", create_type=False),
        nullable=True,
    )
    work_permit_expiry: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    health_cert_expiry: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    # A1 certificate — confirms social security coverage in home country (EU postings)
    a1_cert_status: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)
    a1_cert_expiry: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    # ZUS — Polish social insurance registration status
    zus_status: Mapped[str | None] = mapped_column(sa.String(50), nullable=True)

    # BHP (safety training) certificate expiry — Bezpieczeństwo i Higiena Pracy
    safety_cert_expiry: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )

    # Current placement — denormalised snapshot updated when assignment is created/ended.
    # Source of truth remains the assignments table; this enables fast list-view queries.
    current_client_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assignment_start_date: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    assignment_end_date: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )

    # Worker attendance/employment status for performance tracking
    attendance_status: Mapped[AttendanceStatus] = mapped_column(
        sa.Enum(AttendanceStatus, name="attendance_status_enum", create_type=False),
        nullable=False,
        server_default="active",
    )

    # GDPR consent — must be captured before any data processing
    gdpr_consent: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.false()
    )
    gdpr_consent_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    # Auto-set to (created_at + 12 months) by the workers_gdpr_delete_at_trigger.
    # Extend or clear this field when the worker is placed on an active assignment.
    gdpr_delete_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
