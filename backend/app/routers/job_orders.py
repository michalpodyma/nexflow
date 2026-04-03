from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.enums import JobOrderStatus, JobOrderUrgency
from app.models.job_orders import JobOrder
from app.schemas.job_orders import (
    JobOrderCreate,
    JobOrderRead,
    JobOrderUpdate,
    PaginatedJobOrders,
)

router = APIRouter(prefix="/api/v1/job-orders", tags=["job-orders"])


@router.get("", response_model=PaginatedJobOrders)
async def list_job_orders(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    status: JobOrderStatus | None = Query(None),
    client_id: UUID | None = Query(None),
    urgency: JobOrderUrgency | None = Query(None),
) -> PaginatedJobOrders:
    filters = []
    if status is not None:
        filters.append(JobOrder.status == status)
    if client_id is not None:
        filters.append(JobOrder.client_id == client_id)
    if urgency is not None:
        filters.append(JobOrder.urgency == urgency)

    offset = (page - 1) * page_size

    count_q = select(func.count()).select_from(JobOrder)
    if filters:
        count_q = count_q.where(*filters)
    total: int = (await db.execute(count_q)).scalar_one()

    items_q = select(JobOrder).order_by(JobOrder.created_at.desc()).offset(offset).limit(page_size)
    if filters:
        items_q = items_q.where(*filters)
    items = list((await db.execute(items_q)).scalars().all())

    return PaginatedJobOrders(
        items=[JobOrderRead.model_validate(o) for o in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_order_id}", response_model=JobOrderRead)
async def get_job_order(
    job_order_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JobOrderRead:
    row = await db.get(JobOrder, job_order_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Job order not found")
    return JobOrderRead.model_validate(row)


@router.post("", response_model=JobOrderRead, status_code=201)
async def create_job_order(
    body: JobOrderCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JobOrderRead:
    order = JobOrder(**body.model_dump())
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return JobOrderRead.model_validate(order)


@router.patch("/{job_order_id}", response_model=JobOrderRead)
async def update_job_order(
    job_order_id: UUID,
    body: JobOrderUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JobOrderRead:
    order = await db.get(JobOrder, job_order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Job order not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    order.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(order)
    return JobOrderRead.model_validate(order)
