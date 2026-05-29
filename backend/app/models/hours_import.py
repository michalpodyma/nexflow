"""
Hours import models.

HoursImportBatch   — one row per uploaded spreadsheet file
ClientColumnMapping — saved header→field mappings per client
WorkerHours         — one row per imported work-hours record
"""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class HoursImportBatch(Base):
    __tablename__ = "hours_import_batches"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(sa.String(500), nullable=False)
    storage_key: Mapped[str] = mapped_column(sa.String(1000), nullable=False)
    content_type: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(sa.String(20), nullable=False, server_default="pending")
    raw_headers: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    row_count: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    matched_count: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    unmatched_count: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    flagged_count: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    uploaded_by_user: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )


class ClientColumnMapping(Base):
    __tablename__ = "client_column_mappings"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    spreadsheet_header: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    internal_field: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )


class WorkerHours(Base):
    __tablename__ = "worker_hours"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
    )
    batch_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("hours_import_batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    worker_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("workers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assignment_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("assignments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    row_index: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    raw_worker_name: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    work_date: Mapped[date | None] = mapped_column(sa.Date, nullable=True)
    hours_worked: Mapped[Decimal | None] = mapped_column(sa.Numeric(5, 2), nullable=True)
    overtime_hours: Mapped[Decimal | None] = mapped_column(sa.Numeric(5, 2), nullable=True)
    absence_type: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    match_status: Mapped[str] = mapped_column(
        sa.String(20), nullable=False, server_default="unmatched"
    )
    validation_errors: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
