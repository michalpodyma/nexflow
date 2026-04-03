from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.client_activities import ClientActivity
from app.models.client_contacts import ClientContact
from app.models.clients import Client
from app.schemas.clients import (
    ClientActivityCreate,
    ClientActivityRead,
    ClientContactCreate,
    ClientContactRead,
    ClientContactUpdate,
    ClientCreate,
    ClientRead,
    ClientUpdate,
    PaginatedClientActivities,
    PaginatedClients,
)

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


# ── List clients ───────────────────────────────────────────────────────────────

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


# ── Create client ──────────────────────────────────────────────────────────────

@router.post("", response_model=ClientRead, status_code=201)
async def create_client(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ClientCreate,
) -> ClientRead:
    client = Client(**body.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return ClientRead.model_validate(client)


# ── Get single client ──────────────────────────────────────────────────────────

@router.get("/{client_id}", response_model=ClientRead)
async def get_client(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ClientRead:
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return ClientRead.model_validate(client)


# ── Update client (full) ───────────────────────────────────────────────────────

@router.put("/{client_id}", response_model=ClientRead)
async def replace_client(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ClientCreate,
) -> ClientRead:
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    for field, value in body.model_dump().items():
        setattr(client, field, value)

    from sqlalchemy import text
    client.updated_at = (await db.execute(select(func.now()))).scalar_one()

    await db.commit()
    await db.refresh(client)
    return ClientRead.model_validate(client)


# ── Partial update client (PATCH) ──────────────────────────────────────────────

@router.patch("/{client_id}", response_model=ClientRead)
async def update_client(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ClientUpdate,
) -> ClientRead:
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(client, field, value)

    if updates:
        client.updated_at = (await db.execute(select(func.now()))).scalar_one()

    await db.commit()
    await db.refresh(client)
    return ClientRead.model_validate(client)


# ── Client activities ──────────────────────────────────────────────────────────

@router.get("/{client_id}/activities", response_model=PaginatedClientActivities)
async def list_activities(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedClientActivities:
    await _assert_client_exists(client_id, db)
    offset = (page - 1) * page_size

    total_result = await db.execute(
        select(func.count()).select_from(ClientActivity).where(
            ClientActivity.client_id == client_id
        )
    )
    total: int = total_result.scalar_one()

    result = await db.execute(
        select(ClientActivity)
        .where(ClientActivity.client_id == client_id)
        .order_by(ClientActivity.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = list(result.scalars().all())

    return PaginatedClientActivities(
        items=[ClientActivityRead.model_validate(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{client_id}/activities", response_model=ClientActivityRead, status_code=201)
async def create_activity(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ClientActivityCreate,
) -> ClientActivityRead:
    await _assert_client_exists(client_id, db)
    activity = ClientActivity(client_id=client_id, **body.model_dump())
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return ClientActivityRead.model_validate(activity)


# ── Client contacts ────────────────────────────────────────────────────────────

@router.get("/{client_id}/contacts", response_model=list[ClientContactRead])
async def list_contacts(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ClientContactRead]:
    await _assert_client_exists(client_id, db)
    result = await db.execute(
        select(ClientContact)
        .where(ClientContact.client_id == client_id)
        .order_by(ClientContact.is_primary.desc(), ClientContact.created_at.asc())
    )
    contacts = list(result.scalars().all())
    return [ClientContactRead.model_validate(c) for c in contacts]


@router.post("/{client_id}/contacts", response_model=ClientContactRead, status_code=201)
async def create_contact(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ClientContactCreate,
) -> ClientContactRead:
    await _assert_client_exists(client_id, db)
    contact = ClientContact(client_id=client_id, **body.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return ClientContactRead.model_validate(contact)


@router.put("/{client_id}/contacts/{contact_id}", response_model=ClientContactRead)
async def update_contact(
    client_id: UUID,
    contact_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: ClientContactUpdate,
) -> ClientContactRead:
    result = await db.execute(
        select(ClientContact).where(
            ClientContact.id == contact_id,
            ClientContact.client_id == client_id,
        )
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    contact.updated_at = (await db.execute(select(func.now()))).scalar_one()

    await db.commit()
    await db.refresh(contact)
    return ClientContactRead.model_validate(contact)


@router.delete("/{client_id}/contacts/{contact_id}", status_code=204)
async def delete_contact(
    client_id: UUID,
    contact_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(
        select(ClientContact).where(
            ClientContact.id == contact_id,
            ClientContact.client_id == client_id,
        )
    )
    contact = result.scalar_one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    await db.delete(contact)
    await db.commit()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _assert_client_exists(client_id: UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(func.count()).select_from(Client).where(Client.id == client_id)
    )
    if result.scalar_one() == 0:
        raise HTTPException(status_code=404, detail="Client not found")
