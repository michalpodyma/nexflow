from datetime import date, datetime, time
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class ShiftTemplate(Base):
    """
    A recurring shift pattern for a client site.

    days_of_week is a Postgres integer array where 0=Monday … 6=Sunday.
    start_time/end_time are clock times (no date component); they are combined
    with a calendar date in ShiftEntry to produce full timestamps.

    capacity is the maximum number of workers that can be scheduled on this
    template on any single day.
    """

    __tablename__ = "shift_templates"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    position: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    # 0=Monday … 6=Sunday — stored as integer[]
    days_of_week: Mapped[list[int]] = mapped_column(
        ARRAY(sa.Integer), nullable=False
    )
    start_time: Mapped[time] = mapped_column(sa.Time, nullable=False)
    end_time: Mapped[time] = mapped_column(sa.Time, nullable=False)
    capacity: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, server_default="1"
    )
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.true()
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )


class ShiftEntry(Base):
    """
    A single worker scheduled to a specific shift on a specific date.

    template_id is optional — ad-hoc shifts (not derived from a template) have
    template_id=NULL. start_dt/end_dt are full timezone-aware timestamps derived
    from shift_date + template times (or supplied directly for ad-hoc shifts).

    Conflict detection is enforced at the application layer: no two ShiftEntry
    rows for the same worker_id may have overlapping (start_dt, end_dt) intervals.
    """

    __tablename__ = "shift_entries"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    template_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("shift_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    worker_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("workers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    client_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False,
    )
    shift_date: Mapped[date] = mapped_column(sa.Date, nullable=False)
    start_dt: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )
    end_dt: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )

    __table_args__ = (
        # Fast conflict detection: look up all entries for a worker by date
        sa.Index("ix_shift_entries_worker_date", "worker_id", "shift_date"),
        # Fast capacity queries: count entries per client per date
        sa.Index("ix_shift_entries_client_date", "client_id", "shift_date"),
    )
