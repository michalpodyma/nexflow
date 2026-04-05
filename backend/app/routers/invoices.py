import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.celery_client import celery_client
from app.database import get_db
from app.models.clients import Client
from app.models.invoices import Invoice
from app.schemas.invoices import InvoiceCreate, InvoiceRead, InvoiceUpdate, PaginatedInvoices

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])


@router.get("", response_model=PaginatedInvoices)
async def list_invoices(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    client_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedInvoices:
    offset = (page - 1) * page_size
    base_q = select(Invoice)
    if client_id:
        base_q = base_q.where(Invoice.client_id == client_id)

    total: int = (await db.execute(select(func.count()).select_from(base_q.subquery()))).scalar_one()
    items = list((await db.execute(base_q.order_by(Invoice.sale_date.desc()).offset(offset).limit(page_size))).scalars().all())

    return PaginatedInvoices(
        items=[InvoiceRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=InvoiceRead, status_code=201)
async def create_invoice(
    _: CurrentUser,
    body: InvoiceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InvoiceRead:
    # Verify client exists
    client = await db.get(Client, body.client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    # Reject duplicate invoice numbers
    existing = (await db.execute(select(Invoice).where(Invoice.invoice_number == body.invoice_number))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Invoice number already exists")

    invoice = Invoice(**body.model_dump())
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)

    # Notify client by email — non-blocking; dispatch failure must not fail the request.
    try:
        celery_client.send_task(
            "workers.tasks.notifications.send_invoice_sent",
            args=[str(invoice.id)],
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("[invoices] Celery notification dispatch failed (non-blocking): %s", exc)

    return InvoiceRead.model_validate(invoice)


@router.get("/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    _: CurrentUser,
    invoice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InvoiceRead:
    invoice = await db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceRead.model_validate(invoice)


@router.patch("/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(
    _: CurrentUser,
    invoice_id: UUID,
    body: InvoiceUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InvoiceRead:
    invoice = await db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(invoice, field, value)

    await db.commit()
    await db.refresh(invoice)
    return InvoiceRead.model_validate(invoice)
