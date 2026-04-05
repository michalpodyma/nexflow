"""
Shift scheduling endpoints.

Two resource groups:
  /api/v1/shifts/templates  — recurring shift pattern definitions per client
  /api/v1/shifts/schedule   — individual worker-shift assignments (ShiftEntry rows)

Additional utility endpoints:
  GET /api/v1/shifts/conflicts  — check whether a time block conflicts for a worker
  GET /api/v1/shifts/capacity   — open slots per template per day
  GET /api/v1/shifts/export     — weekly schedule as CSV
"""

import csv
import io
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, field_validator
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.clients import Client
from app.models.shifts import ShiftEntry, ShiftTemplate
from app.models.workers import Worker

router = APIRouter(prefix="/api/v1/shifts", tags=["shifts"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ShiftTemplateCreate(BaseModel):
    client_id: UUID
    name: str
    position: str
    days_of_week: list[int]  # 0=Mon … 6=Sun
    start_time: time
    end_time: time
    capacity: int = 1

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("days_of_week must not be empty")
        for d in v:
            if d < 0 or d > 6:
                raise ValueError("days_of_week values must be 0–6")
        return sorted(set(v))

    @field_validator("capacity")
    @classmethod
    def validate_capacity(cls, v: int) -> int:
        if v < 1:
            raise ValueError("capacity must be at least 1")
        return v


class ShiftTemplateUpdate(BaseModel):
    name: str | None = None
    position: str | None = None
    days_of_week: list[int] | None = None
    start_time: time | None = None
    end_time: time | None = None
    capacity: int | None = None
    is_active: bool | None = None

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v: list[int] | None) -> list[int] | None:
        if v is None:
            return v
        if not v:
            raise ValueError("days_of_week must not be empty")
        for d in v:
            if d < 0 or d > 6:
                raise ValueError("days_of_week values must be 0–6")
        return sorted(set(v))

    @field_validator("capacity")
    @classmethod
    def validate_capacity(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("capacity must be at least 1")
        return v


class ShiftTemplateOut(BaseModel):
    id: str
    client_id: str
    client_name: str
    name: str
    position: str
    days_of_week: list[int]
    start_time: str  # "HH:MM"
    end_time: str  # "HH:MM"
    capacity: int
    is_active: bool
    created_at: str
    updated_at: str


class ShiftEntryCreate(BaseModel):
    template_id: UUID | None = None
    worker_id: UUID
    client_id: UUID
    shift_date: date
    start_time: time
    end_time: time
    notes: str | None = None


class ShiftEntryOut(BaseModel):
    id: str
    template_id: str | None
    worker_id: str
    worker_name: str
    client_id: str
    client_name: str
    shift_date: str  # ISO date
    start_dt: str  # ISO datetime
    end_dt: str  # ISO datetime
    notes: str | None
    created_at: str


class ConflictCheckResult(BaseModel):
    has_conflict: bool
    conflicting_entries: list[ShiftEntryOut]


class CapacitySlot(BaseModel):
    template_id: str
    template_name: str
    client_id: str
    client_name: str
    shift_date: str  # ISO date
    start_time: str
    end_time: str
    capacity: int
    booked: int
    available: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _fmt_time(t: time) -> str:
    return t.strftime("%H:%M")


def _make_start_dt(d: date, t: time) -> datetime:
    return datetime(d.year, d.month, d.day, t.hour, t.minute, t.second, tzinfo=timezone.utc)


def _entry_to_out(entry: ShiftEntry, worker: Worker, client: Client) -> ShiftEntryOut:
    return ShiftEntryOut(
        id=str(entry.id),
        template_id=str(entry.template_id) if entry.template_id else None,
        worker_id=str(entry.worker_id),
        worker_name=f"{worker.first_name} {worker.last_name}",
        client_id=str(entry.client_id),
        client_name=client.company_name,
        shift_date=entry.shift_date.isoformat(),
        start_dt=entry.start_dt.isoformat(),
        end_dt=entry.end_dt.isoformat(),
        notes=entry.notes,
        created_at=entry.created_at.isoformat(),
    )


async def _check_conflict(
    db: AsyncSession,
    worker_id: UUID,
    start_dt: datetime,
    end_dt: datetime,
    exclude_id: UUID | None = None,
) -> list[ShiftEntry]:
    """Return any existing ShiftEntry rows that overlap the given time block."""
    stmt = select(ShiftEntry).where(
        and_(
            ShiftEntry.worker_id == worker_id,
            ShiftEntry.start_dt < end_dt,
            ShiftEntry.end_dt > start_dt,
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(ShiftEntry.id != exclude_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Template endpoints
# ---------------------------------------------------------------------------


@router.get("/templates", response_model=list[ShiftTemplateOut])
async def list_templates(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    client_id: UUID | None = Query(default=None),
    active_only: bool = Query(default=False),
) -> list[ShiftTemplateOut]:
    stmt = (
        select(ShiftTemplate, Client)
        .join(Client, ShiftTemplate.client_id == Client.id)
        .order_by(Client.company_name, ShiftTemplate.name)
    )
    if client_id is not None:
        stmt = stmt.where(ShiftTemplate.client_id == client_id)
    if active_only:
        stmt = stmt.where(ShiftTemplate.is_active.is_(True))

    rows = (await db.execute(stmt)).all()
    return [
        ShiftTemplateOut(
            id=str(t.id),
            client_id=str(t.client_id),
            client_name=c.company_name,
            name=t.name,
            position=t.position,
            days_of_week=t.days_of_week,
            start_time=_fmt_time(t.start_time),
            end_time=_fmt_time(t.end_time),
            capacity=t.capacity,
            is_active=t.is_active,
            created_at=t.created_at.isoformat(),
            updated_at=t.updated_at.isoformat(),
        )
        for t, c in rows
    ]


@router.post("/templates", response_model=ShiftTemplateOut, status_code=201)
async def create_template(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ShiftTemplateCreate,
) -> ShiftTemplateOut:
    # Verify client exists
    client = await db.get(Client, body.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    template = ShiftTemplate(
        client_id=body.client_id,
        name=body.name,
        position=body.position,
        days_of_week=body.days_of_week,
        start_time=body.start_time,
        end_time=body.end_time,
        capacity=body.capacity,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return ShiftTemplateOut(
        id=str(template.id),
        client_id=str(template.client_id),
        client_name=client.company_name,
        name=template.name,
        position=template.position,
        days_of_week=template.days_of_week,
        start_time=_fmt_time(template.start_time),
        end_time=_fmt_time(template.end_time),
        capacity=template.capacity,
        is_active=template.is_active,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
    )


@router.put("/templates/{template_id}", response_model=ShiftTemplateOut)
async def update_template(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    template_id: UUID,
    body: ShiftTemplateUpdate,
) -> ShiftTemplateOut:
    result = await db.execute(
        select(ShiftTemplate, Client)
        .join(Client, ShiftTemplate.client_id == Client.id)
        .where(ShiftTemplate.id == template_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Shift template not found")

    template, client = row
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(template, field, value)
    template.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(template)

    return ShiftTemplateOut(
        id=str(template.id),
        client_id=str(template.client_id),
        client_name=client.company_name,
        name=template.name,
        position=template.position,
        days_of_week=template.days_of_week,
        start_time=_fmt_time(template.start_time),
        end_time=_fmt_time(template.end_time),
        capacity=template.capacity,
        is_active=template.is_active,
        created_at=template.created_at.isoformat(),
        updated_at=template.updated_at.isoformat(),
    )


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    template_id: UUID,
) -> None:
    template = await db.get(ShiftTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=404, detail="Shift template not found")

    # Check for existing entries referencing this template
    count_result = await db.execute(
        select(func.count()).where(ShiftEntry.template_id == template_id)
    )
    if (count_result.scalar() or 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete template with existing schedule entries. Deactivate it instead.",
        )

    await db.delete(template)
    await db.commit()


# ---------------------------------------------------------------------------
# Schedule (ShiftEntry) endpoints
# ---------------------------------------------------------------------------


@router.get("/schedule", response_model=list[ShiftEntryOut])
async def list_schedule(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(default=None),
    end: date = Query(default=None),
    client_id: UUID | None = Query(default=None),
    worker_id: UUID | None = Query(default=None),
    template_id: UUID | None = Query(default=None),
) -> list[ShiftEntryOut]:
    today = datetime.now(timezone.utc).date()
    if start is None:
        start = today - timedelta(days=today.weekday())  # Monday of current week
    if end is None:
        end = start + timedelta(days=6)

    stmt = (
        select(ShiftEntry, Worker, Client)
        .join(Worker, ShiftEntry.worker_id == Worker.id)
        .join(Client, ShiftEntry.client_id == Client.id)
        .where(
            and_(
                ShiftEntry.shift_date >= start,
                ShiftEntry.shift_date <= end,
            )
        )
        .order_by(ShiftEntry.shift_date, Worker.last_name, Worker.first_name, ShiftEntry.start_dt)
    )

    if client_id is not None:
        stmt = stmt.where(ShiftEntry.client_id == client_id)
    if worker_id is not None:
        stmt = stmt.where(ShiftEntry.worker_id == worker_id)
    if template_id is not None:
        stmt = stmt.where(ShiftEntry.template_id == template_id)

    rows = (await db.execute(stmt)).all()
    return [_entry_to_out(e, w, c) for e, w, c in rows]


@router.post("/schedule", response_model=ShiftEntryOut, status_code=201)
async def create_schedule_entry(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ShiftEntryCreate,
) -> ShiftEntryOut:
    worker = await db.get(Worker, body.worker_id)
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    client = await db.get(Client, body.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    start_dt = _make_start_dt(body.shift_date, body.start_time)
    end_dt = _make_start_dt(body.shift_date, body.end_time)

    # Handle overnight shifts (end_time < start_time means shift crosses midnight)
    if end_dt <= start_dt:
        end_dt += timedelta(days=1)

    # Conflict detection
    conflicts = await _check_conflict(db, body.worker_id, start_dt, end_dt)
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail=f"Worker already has {len(conflicts)} overlapping shift(s) in this time block.",
        )

    entry = ShiftEntry(
        template_id=body.template_id,
        worker_id=body.worker_id,
        client_id=body.client_id,
        shift_date=body.shift_date,
        start_dt=start_dt,
        end_dt=end_dt,
        notes=body.notes,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return _entry_to_out(entry, worker, client)


@router.delete("/schedule/{entry_id}", status_code=204)
async def delete_schedule_entry(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    entry_id: UUID,
) -> None:
    entry = await db.get(ShiftEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Shift entry not found")
    await db.delete(entry)
    await db.commit()


# ---------------------------------------------------------------------------
# Conflict check
# ---------------------------------------------------------------------------


@router.get("/conflicts", response_model=ConflictCheckResult)
async def check_conflicts(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    worker_id: UUID = Query(...),
    start_dt: datetime = Query(..., description="ISO datetime (UTC)"),
    end_dt: datetime = Query(..., description="ISO datetime (UTC)"),
    exclude_entry_id: UUID | None = Query(default=None),
) -> ConflictCheckResult:
    # Normalize to UTC
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    if end_dt.tzinfo is None:
        end_dt = end_dt.replace(tzinfo=timezone.utc)

    conflicts = await _check_conflict(db, worker_id, start_dt, end_dt, exclude_id=exclude_entry_id)
    if not conflicts:
        return ConflictCheckResult(has_conflict=False, conflicting_entries=[])

    # Enrich conflict entries with worker/client names
    out_entries: list[ShiftEntryOut] = []
    for c_entry in conflicts:
        w = await db.get(Worker, c_entry.worker_id)
        cl = await db.get(Client, c_entry.client_id)
        if w and cl:
            out_entries.append(_entry_to_out(c_entry, w, cl))

    return ConflictCheckResult(has_conflict=True, conflicting_entries=out_entries)


# ---------------------------------------------------------------------------
# Capacity view
# ---------------------------------------------------------------------------


@router.get("/capacity", response_model=list[CapacitySlot])
async def get_capacity(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(default=None),
    end: date = Query(default=None),
    client_id: UUID | None = Query(default=None),
) -> list[CapacitySlot]:
    today = datetime.now(timezone.utc).date()
    if start is None:
        start = today - timedelta(days=today.weekday())
    if end is None:
        end = start + timedelta(days=6)

    # Fetch all active templates in scope
    tmpl_stmt = (
        select(ShiftTemplate, Client)
        .join(Client, ShiftTemplate.client_id == Client.id)
        .where(ShiftTemplate.is_active.is_(True))
    )
    if client_id is not None:
        tmpl_stmt = tmpl_stmt.where(ShiftTemplate.client_id == client_id)
    templates = (await db.execute(tmpl_stmt)).all()

    if not templates:
        return []

    # Count booked entries per (template_id, shift_date)
    booked_stmt = (
        select(
            ShiftEntry.template_id,
            ShiftEntry.shift_date,
            func.count(ShiftEntry.id).label("cnt"),
        )
        .where(
            and_(
                ShiftEntry.shift_date >= start,
                ShiftEntry.shift_date <= end,
                ShiftEntry.template_id.in_([t.id for t, _ in templates]),
            )
        )
        .group_by(ShiftEntry.template_id, ShiftEntry.shift_date)
    )
    booked_rows = (await db.execute(booked_stmt)).all()
    booked_map: dict[tuple, int] = {
        (str(r.template_id), r.shift_date.isoformat()): r.cnt for r in booked_rows
    }

    slots: list[CapacitySlot] = []
    current = start
    while current <= end:
        dow = current.weekday()  # 0=Mon … 6=Sun
        for template, client in templates:
            if dow not in template.days_of_week:
                current = current + timedelta(days=0)  # no-op; just continue below
                continue
            key = (str(template.id), current.isoformat())
            booked = booked_map.get(key, 0)
            slots.append(
                CapacitySlot(
                    template_id=str(template.id),
                    template_name=template.name,
                    client_id=str(template.client_id),
                    client_name=client.company_name,
                    shift_date=current.isoformat(),
                    start_time=_fmt_time(template.start_time),
                    end_time=_fmt_time(template.end_time),
                    capacity=template.capacity,
                    booked=booked,
                    available=max(0, template.capacity - booked),
                )
            )
        current += timedelta(days=1)

    return slots


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------


@router.get("/export")
async def export_schedule(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(default=None),
    end: date = Query(default=None),
    client_id: UUID | None = Query(default=None),
) -> Response:
    today = datetime.now(timezone.utc).date()
    if start is None:
        start = today - timedelta(days=today.weekday())
    if end is None:
        end = start + timedelta(days=6)

    stmt = (
        select(ShiftEntry, Worker, Client, ShiftTemplate)
        .join(Worker, ShiftEntry.worker_id == Worker.id)
        .join(Client, ShiftEntry.client_id == Client.id)
        .outerjoin(ShiftTemplate, ShiftEntry.template_id == ShiftTemplate.id)
        .where(
            and_(
                ShiftEntry.shift_date >= start,
                ShiftEntry.shift_date <= end,
            )
        )
        .order_by(ShiftEntry.shift_date, Worker.last_name, Worker.first_name, ShiftEntry.start_dt)
    )
    if client_id is not None:
        stmt = stmt.where(ShiftEntry.client_id == client_id)

    rows = (await db.execute(stmt)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["Date", "Day", "Worker", "Client", "Position", "Start", "End", "Notes"]
    )
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for entry, worker, client, template in rows:
        writer.writerow(
            [
                entry.shift_date.strftime("%Y-%m-%d"),
                day_names[entry.shift_date.weekday()],
                f"{worker.last_name}, {worker.first_name}",
                client.company_name,
                template.position if template else "",
                entry.start_dt.strftime("%H:%M"),
                entry.end_dt.strftime("%H:%M"),
                entry.notes or "",
            ]
        )

    filename = f"schedule_{start.isoformat()}_{end.isoformat()}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
