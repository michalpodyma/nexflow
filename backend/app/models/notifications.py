from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class NotificationLog(Base):
    """
    Audit log of every notification dispatched by the platform.

    Not a full delivery receipt (no webhook tracking) — just a record of
    what was attempted and whether the upstream provider accepted it.

    subject_id / subject_type reference the entity that triggered the
    notification (candidate, worker, invoice) — no FK constraint so the
    log survives if the source entity is deleted.
    """

    __tablename__ = "notification_logs"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    # Short snake_case name: welcome_candidate, compliance_expiry, contract_expiry,
    # invoice_sent, invoice_overdue
    notification_type: Mapped[str] = mapped_column(sa.String(60), nullable=False)
    # 'email' or 'sms'
    channel: Mapped[str] = mapped_column(sa.String(10), nullable=False)
    # Destination: email address or E.164 phone number
    recipient: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    # Optional reference back to the triggering entity
    subject_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), nullable=True)
    subject_type: Mapped[str | None] = mapped_column(sa.String(30), nullable=True)
    # 'sent' or 'failed'
    status: Mapped[str] = mapped_column(sa.String(10), nullable=False)
    error_message: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
