from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
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
    WorkerUpdate,
)

router = APIRouter(prefix="/api/v1/workers", tags=["workers"])


def _build_worker_read(worker: Worker, client_name: str | None) -> WorkerRead:
    data = WorkerRead.model_validate(worker)
    data.current_client_name = client_name
    return data


@router.get("", response_model=PaginatedWorkers)
async def list_workers(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    expiring_docs: bool = Query(
        False, description="Filter to workers with any document expiring within 30 days"
    ),
) -> PaginatedWorkers:
    offset = (page - 1) * page_size
    cutoff = datetime.now(timezone.utc) + timedelta(days=30)

    base_q = select(Worker)
    if expiring_docs:
        base_q = base_q.where(
            or_(
                Worker.work_permit_expiry <= cutoff,
                Worker.health_cert_expiry <= cutoff,
                Worker.safety_cert_expiry <= cutoff,
            )
        )

    total_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total: int = total_result.scalar_one()

    workers_result = await db.execute(
        base_q.order_by(Worker.created_at.desc()).offset(offset).limit(page_size)
    )
    workers = list(workers_result.scalars().all())

    # Batch-fetch client names for workers with a current_client_id
    client_ids = {w.current_client_id for w in workers if w.current_client_id}
    client_names: dict[UUID, str] = {}
    if client_ids:
        client_result = await db.execute(
            select(Client.id, Client.company_name).where(Client.id.in_(client_ids))
        )
        client_names = {row.id: row.company_name for row in client_result}

    items = [
        _build_worker_read(w, client_names.get(w.current_client_id))
        for w in workers
    ]
    return PaginatedWorkers(items=items, total=total, page=page, page_size=page_size)


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

    client_name: str | None = None
    if worker.current_client_id:
        cr = await db.execute(
            select(Client.company_name).where(Client.id == worker.current_client_id)
        )
        client_name = cr.scalar_one_or_none()

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
            client_name=cn,
            employer_rate=a.employer_rate,
            start_date=a.start_date,
            end_date=a.end_date,
            is_active=a.is_active,
        )
        for a, cn in rows
    ]

    detail = WorkerDetail.model_validate(worker)
    detail.current_client_name = client_name
    detail.assignments = assignments
    return detail


@router.patch("/{worker_id}", response_model=WorkerRead)
async def update_worker(
    worker_id: UUID,
    body: WorkerUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkerRead:
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(worker, field, value)

    await db.commit()
    await db.refresh(worker)

    client_name: str | None = None
    if worker.current_client_id:
        cr = await db.execute(
            select(Client.company_name).where(Client.id == worker.current_client_id)
        )
        client_name = cr.scalar_one_or_none()

    return _build_worker_read(worker, client_name)
