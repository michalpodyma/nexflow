from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.client_contacts import ClientContact
from app.models.clients import Client
from app.models.prospects import Prospect
from app.schemas.clients import ClientCreate, ClientRead
from app.schemas.prospects import (
    ConvertProspectResponse,
    PaginatedProspects,
    ProspectCreate,
    ProspectRead,
    ProspectUpdate,
)

router = APIRouter(prefix="/api/v1/prospects", tags=["prospects"])


# ── List prospects ─────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedProspects)
async def list_prospects(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    source: str | None = Query(None),
) -> PaginatedProspects:
    filters = []
    if status:
        filters.append(Prospect.status == status)
    if source:
        filters.append(Prospect.source == source)

    count_q = select(func.count()).select_from(Prospect)
    if filters:
        count_q = count_q.where(*filters)
    total: int = (await db.execute(count_q)).scalar_one()

    offset = (page - 1) * page_size
    q = select(Prospect).order_by(
        Prospect.next_follow_up.asc().nulls_last(),
        Prospect.created_at.desc(),
    ).offset(offset).limit(page_size)
    if filters:
        q = q.where(*filters)

    items = list((await db.execute(q)).scalars().all())
    return PaginatedProspects(
        items=[ProspectRead.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Create prospect ────────────────────────────────────────────────────────────

@router.post("", response_model=ProspectRead, status_code=201)
async def create_prospect(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ProspectCreate,
) -> ProspectRead:
    prospect = Prospect(**body.model_dump())
    db.add(prospect)
    await db.commit()
    await db.refresh(prospect)
    return ProspectRead.model_validate(prospect)


# ── Get single prospect ────────────────────────────────────────────────────────

@router.get("/{prospect_id}", response_model=ProspectRead)
async def get_prospect(
    prospect_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProspectRead:
    prospect = await _get_or_404(prospect_id, db)
    return ProspectRead.model_validate(prospect)


# ── Update prospect ────────────────────────────────────────────────────────────

@router.put("/{prospect_id}", response_model=ProspectRead)
async def update_prospect(
    prospect_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ProspectUpdate,
) -> ProspectRead:
    prospect = await _get_or_404(prospect_id, db)

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(prospect, field, value)

    if updates:
        prospect.updated_at = (await db.execute(select(func.now()))).scalar_one()

    await db.commit()
    await db.refresh(prospect)
    return ProspectRead.model_validate(prospect)


# ── Convert prospect to client ─────────────────────────────────────────────────

@router.post("/{prospect_id}/convert", response_model=ConvertProspectResponse, status_code=201)
async def convert_prospect(
    prospect_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConvertProspectResponse:
    prospect = await _get_or_404(prospect_id, db)

    if prospect.status == "converted":
        raise HTTPException(status_code=409, detail="Prospect is already converted")

    # Create client from prospect data
    client = Client(
        company_name=prospect.company_name,
        email=prospect.contact_email,
        phone=prospect.contact_phone,
        account_manager_name=prospect.assigned_to,
    )
    db.add(client)
    await db.flush()  # get client.id before committing

    # Create primary contact from prospect contact data
    if prospect.contact_name:
        contact = ClientContact(
            client_id=client.id,
            name=prospect.contact_name,
            email=prospect.contact_email,
            phone=prospect.contact_phone,
            is_primary=True,
        )
        db.add(contact)

    # Update prospect
    prospect.status = "converted"
    prospect.converted_to_client_id = client.id
    prospect.updated_at = (await db.execute(select(func.now()))).scalar_one()

    await db.commit()
    await db.refresh(prospect)
    await db.refresh(client)

    return ConvertProspectResponse(
        prospect=ProspectRead.model_validate(prospect),
        client_id=client.id,
    )


# ── Helper ─────────────────────────────────────────────────────────────────────

async def _get_or_404(prospect_id: UUID, db: AsyncSession) -> Prospect:
    result = await db.execute(select(Prospect).where(Prospect.id == prospect_id))
    prospect = result.scalar_one_or_none()
    if prospect is None:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return prospect
