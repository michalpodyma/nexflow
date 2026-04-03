import enum
from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ActivityType(str, enum.Enum):
    note = "note"
    call = "call"
    email = "email"
    meeting = "meeting"


class ClientActivity(Base):
    """
    Activity log entry for a client (note, call, email, or meeting).
    """

    __tablename__ = "client_activities"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_type: Mapped[ActivityType] = mapped_column(
        sa.Enum(ActivityType, name="client_activity_type_enum", create_type=False),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(sa.Text, nullable=False)
    created_by: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )
