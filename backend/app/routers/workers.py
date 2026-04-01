from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.assignments import Assignment
from app.models.clients import Client
from app.models.workers import Worker
from app.schemas.workers import (
    AssignmentSummary,
    PaginatedWorkers,
    WorkerDetail,
    WorkerRead,
    WorkerUpdateStatus,
)

router = APIRouter(prefix="/api/v1/workers", tags=["workers"])


@router.get("", response_model=PaginatedWorkers)
async def list_workers(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedWorkers:
    offset = (page - 1) * page_size

    total_result = await db.execute(select(func.count()).select_from(Worker))
    total: int = total_result.scalar_one()

    result = await db.execute(
        select(Worker).order_by(Worker.created_at.desc()).offset(offset).limit(page_size)
    )
    items = list(result.scalars().all())

    return PaginatedWorkers(
        items=[WorkerRead.model_validate(w) for w in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{worker_id}", response_model=WorkerDetail)
async def get_worker(
    worker_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkerDetail:
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Fetch assignments joined with client name
    asgn_result = await db.execute(
        select(Assignment, Client.company_name)
        .join(Client, Assignment.client_id == Client.id)
        .where(Assignment.worker_id == worker_id)
        .order_by(Assignment.start_date.desc())
    )
    rows = asgn_result.all()
    assignments = [
        AssignmentSummary(
            id=a.id,
            position=a.position,
            client_id=a.client_id,
            client_name=client_name,
            employer_rate=a.employer_rate,
            start_date=a.start_date,
            end_date=a.end_date,
            is_active=a.is_active,
        )
        for a, client_name in rows
    ]

    detail = WorkerDetail.model_validate(worker)
    detail.assignments = assignments
    return detail


@router.patch("/{worker_id}", response_model=WorkerRead)
async def update_worker_status(
    worker_id: UUID,
    body: WorkerUpdateStatus,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkerRead:
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker.attendance_status = body.attendance_status
    await db.commit()
    await db.refresh(worker)
    return WorkerRead.model_validate(worker)
