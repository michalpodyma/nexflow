from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import AuditAction


class AuditLog(Base):
    """
    Generic immutable audit trail for sensitive table mutations.

    Write-only — never UPDATE or DELETE rows in this table. Application code
    (or a future DB trigger) inserts one row per DML operation on any audited table.

    Audited tables (minimum for Phase 1):
        workers, candidates, assignments, invoices, gdpr_consents

    changed_by format:
        "agent:<agent_id>"  — mutation by a Paperclip agent
        "user:<user_id>"    — mutation by a human operator
        "system"            — automated task (Celery job, migration)

    payload (JSONB) — JSON diff of changed fields:
        {
          "before": {"payment_status": "pending"},
          "after":  {"payment_status": "paid"}
        }
    For inserts, "before" is null. For deletes, "after" is null.
    """

    __tablename__ = "audit_log"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    table_name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    record_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    action: Mapped[AuditAction] = mapped_column(
        sa.Enum(AuditAction, name="audit_action", create_type=False),
        nullable=False,
    )
    # "agent:<id>", "user:<id>", or "system"
    changed_by: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    # JSON diff — see docstring for shape
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
