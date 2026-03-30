from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.workers import Worker
from app.schemas.workers import PaginatedWorkers, WorkerRead

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
