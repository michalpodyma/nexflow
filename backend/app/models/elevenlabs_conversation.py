"""ElevenLabs post-call conversation record (EUR-1575)."""

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import ConversationIntent, HRappkaSyncStatus


class ElevenLabsConversation(Base):
    """
    Persists every ElevenLabs post-call webhook payload.

    conversation_id is the ElevenLabs-assigned PK — webhook retries are idempotent
    via ON CONFLICT DO NOTHING on this column.
    """

    __tablename__ = "elevenlabs_conversations"

    id: Mapped[str] = mapped_column(sa.String(128), primary_key=True)
    wa_phone_number: Mapped[str | None] = mapped_column(sa.String(30), nullable=True)
    agent_id: Mapped[str | None] = mapped_column(sa.String(128), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    duration_seconds: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    transcript_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    summary_text: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    evaluation_results_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    intent: Mapped[ConversationIntent | None] = mapped_column(
        sa.Enum(
            ConversationIntent,
            name="conversation_intent_enum",
            create_type=False,
        ),
        nullable=True,
    )
    hrappka_sync_status: Mapped[HRappkaSyncStatus] = mapped_column(
        sa.Enum(
            HRappkaSyncStatus,
            name="hrappka_sync_status_enum",
            create_type=False,
        ),
        nullable=False,
        server_default="pending",
    )
    hrappka_target_id: Mapped[str | None] = mapped_column(sa.String(64), nullable=True)
    hrappka_sync_error: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )
