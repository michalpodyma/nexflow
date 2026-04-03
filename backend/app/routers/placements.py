from datetime import date, datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.assignments import Assignment
from app.models.clients import Client
from app.models.workers import Worker

router = APIRouter(prefix="/api/v1/placements", tags=["placements"])


class CalendarEntry(BaseModel):
    id: str
    worker_id: str
    worker_name: str
    client_id: str
    client_name: str
    position: str
    start_date: str  # ISO date
    end_date: str | None  # ISO date, None = open-ended
    is_active: bool


@router.get("/calendar", response_model=list[CalendarEntry])
async def get_calendar(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    start: date = Query(default=None, description="Range start (ISO date). Defaults to first of current month."),
    end: date = Query(default=None, description="Range end (ISO date). Defaults to last of current month."),
    client_id: UUID | None = Query(default=None),
    worker_id: UUID | None = Query(default=None),
    active_only: bool = Query(default=False),
) -> list[CalendarEntry]:
    today = datetime.now(timezone.utc).date()
    if start is None:
        start = today.replace(day=1)
    if end is None:
        # last day of current month
        if today.month == 12:
            end = today.replace(month=12, day=31)
        else:
            end = today.replace(month=today.month + 1, day=1).replace(day=1) - __import__("datetime").timedelta(days=1)

    start_dt = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    end_dt = datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc)

    stmt = (
        select(Assignment, Worker, Client)
        .join(Worker, Assignment.worker_id == Worker.id)
        .join(Client, Assignment.client_id == Client.id)
        .where(
            # assignment overlaps the query window:
            # starts before end of window AND (ends after start of window OR is open-ended)
            and_(
                Assignment.start_date <= end_dt,
                or_(
                    Assignment.end_date.is_(None),
                    Assignment.end_date >= start_dt,
                ),
            )
        )
    )

    if client_id is not None:
        stmt = stmt.where(Assignment.client_id == client_id)
    if worker_id is not None:
        stmt = stmt.where(Assignment.worker_id == worker_id)
    if active_only:
        stmt = stmt.where(Assignment.is_active.is_(True))

    stmt = stmt.order_by(Worker.last_name, Worker.first_name, Assignment.start_date)

    result = await db.execute(stmt)
    rows = result.all()

    entries: list[CalendarEntry] = []
    for assignment, worker, client in rows:
        entries.append(
            CalendarEntry(
                id=str(assignment.id),
                worker_id=str(assignment.worker_id),
                worker_name=f"{worker.first_name} {worker.last_name}",
                client_id=str(assignment.client_id),
                client_name=client.company_name,
                position=assignment.position,
                start_date=assignment.start_date.date().isoformat(),
                end_date=assignment.end_date.date().isoformat() if assignment.end_date else None,
                is_active=assignment.is_active,
            )
        )

    return entries
