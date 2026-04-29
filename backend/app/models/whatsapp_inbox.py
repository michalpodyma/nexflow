"""
WhatsApp Inbox Event — read-only store for OpenClaw triage.

Every inbound WhatsApp message is mirrored here so OpenClaw can observe the
inbox without needing WHATSAPP_ACCESS_TOKEN.  The FSM continues to own replies;
this table is append-only from the webhook handler's perspective.

PII note: from_phone_masked stores only the last 4 digits. The full phone is
not stored here — it lives in candidates.phone (accessible via candidate_id FK).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class WhatsAppInboxEvent(Base):
    __tablename__ = "whatsapp_inbox_events"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    # FK to candidates table; may be NULL briefly if created before candidate lookup
    candidate_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("candidates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Last 4 digits only — enough to identify the thread without exposing PII
    from_phone_masked: Mapped[str] = mapped_column(sa.String(4), nullable=False)
    # Full message body — OpenClaw needs this for triage; it must NOT forward
    # raw content to Telegram. It must summarise and link to the Paperclip issue.
    message_text: Mapped[str] = mapped_column(sa.Text, nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
        index=True,
    )
    # Set when OpenClaw acknowledges this event in a briefing or issue
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    # Paperclip issue ID created for this event (if any)
    paperclip_issue_id: Mapped[str | None] = mapped_column(sa.String(64), nullable=True)
