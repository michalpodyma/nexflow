from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.clients import Client
from app.schemas.clients import ClientRead, PaginatedClients

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


@router.get("", response_model=PaginatedClients)
async def list_clients(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedClients:
    offset = (page - 1) * page_size

    total_result = await db.execute(select(func.count()).select_from(Client))
    total: int = total_result.scalar_one()

    result = await db.execute(
        select(Client).order_by(Client.created_at.desc()).offset(offset).limit(page_size)
    )
    items = list(result.scalars().all())

    return PaginatedClients(
        items=[ClientRead.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )
