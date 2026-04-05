"""
WorkerOTP — one-time password records for worker self-service portal login.

Each row represents a single OTP request. Codes expire after 10 minutes
and can only be used once (used_at is set on first successful verification).
Old records are safe to keep for audit; a daily cleanup task can prune rows
older than 24 hours.
"""

from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class WorkerOTP(Base):
    __tablename__ = "worker_otps"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    # E.164 phone number — must match workers.phone
    phone: Mapped[str] = mapped_column(sa.String(30), nullable=False, index=True)
    # 6-digit numeric code stored in plain text (short TTL, low sensitivity)
    code: Mapped[str] = mapped_column(sa.String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
