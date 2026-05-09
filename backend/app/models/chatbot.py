from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import ChatbotChannel


class ChatbotSession(Base):
    """
    State and transcript for a WhatsApp or web chatbot screening session.

    session_state (JSONB) — internal FSM state managed by the chatbot worker:
        {
          "step": "language_selection",
          "language": "pl",
          "awaiting": "preferred_position"
        }

    messages (JSONB array) — full conversation transcript:
        [
          {"role": "bot", "text": "Cześć! ...", "ts": "2026-03-30T10:00:00Z"},
          {"role": "user", "text": "Magazynier", "ts": "2026-03-30T10:00:05Z"}
        ]

    score — computed at session completion; written to candidates.screening_score.
    """

    __tablename__ = "chatbot_sessions"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    candidate_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
    )
    channel: Mapped[ChatbotChannel] = mapped_column(
        sa.Enum(ChatbotChannel, name="chatbot_channel", create_type=False),
        nullable=False,
    )
    # Internal FSM state — see docstring for shape
    session_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Full conversation transcript — append-only array
    messages: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    # NULL until the session reaches a terminal state (pass/fail/abandoned)
    completed_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    # 0–100 composite score; NULL until completed
    score: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    # Full LLM audit log — requests, responses, and tool calls per session.
    # Populated only when WHATSAPP_SCREENER_USE_LLM=true.
    llm_log: Mapped[list | None] = mapped_column(JSONB, nullable=True)
