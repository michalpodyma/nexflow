"""
Invoice auto-generation service.

Called after a HoursImportBatch is committed to create a draft Invoice
with per-worker line items. No notification is dispatched for drafts —
that happens only when the account manager explicitly sends the invoice.
"""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignments import Assignment
from app.models.clients import Client
from app.models.enums import Currency, PaymentStatus
from app.models.hours_import import HoursImportBatch, WorkerHours
from app.models.invoices import Invoice, InvoiceLineItem
from app.models.workers import Worker

logger = logging.getLogger(__name__)


async def create_draft_from_batch(
    batch: HoursImportBatch,
    db: AsyncSession,
) -> Invoice | None:
    """
    Generate a draft Invoice from committed WorkerHours in the given batch.

    Steps:
    1. Load matched hours already flushed in the current transaction.
    2. Look up active assignments for each matched worker at the batch client.
    3. Aggregate hours per worker, calculate line items.
    4. Sum net, apply VAT per client currency (PLN=23%, EUR=0%).
    5. Assign FV/YYYY/### invoice number.
    6. Persist Invoice + InvoiceLineItems (no commit — caller commits).
    7. Backfill assignment_id on the WorkerHours rows.

    Returns the new Invoice, or None if no billable hours were found.
    """
    # 1. Load matched hours for this batch (already flushed)
    hours_result = await db.execute(
        select(WorkerHours)
        .where(WorkerHours.batch_id == batch.id)
        .where(WorkerHours.match_status == "matched")
        .where(WorkerHours.worker_id.is_not(None))
        .where(WorkerHours.hours_worked.is_not(None))
    )
    hours_rows: list[WorkerHours] = list(hours_result.scalars().all())

    if not hours_rows:
        logger.info("[invoice_service] batch %s has no matched hours — skipping invoice", batch.id)
        return None

    # 2. Load client
    client = await db.get(Client, batch.client_id)
    if client is None:
        logger.warning("[invoice_service] client %s not found — cannot create invoice", batch.client_id)
        return None

    # 3. Find active assignments for each matched worker at this client
    worker_ids = list({wh.worker_id for wh in hours_rows if wh.worker_id})
    assignments_result = await db.execute(
        select(Assignment)
        .where(Assignment.worker_id.in_(worker_ids))
        .where(Assignment.client_id == batch.client_id)
        .where(Assignment.is_active.is_(True))
    )
    assignment_by_worker: dict[UUID, Assignment] = {
        a.worker_id: a for a in assignments_result.scalars().all()
    }

    # Load worker names for descriptions
    workers_result = await db.execute(
        select(Worker).where(Worker.id.in_(worker_ids))
    )
    worker_by_id: dict[UUID, Worker] = {
        w.id: w for w in workers_result.scalars().all()
    }

    # 4. Aggregate hours per worker
    hours_by_worker: dict[UUID, Decimal] = defaultdict(Decimal)
    work_dates: list[date] = []
    for wh in hours_rows:
        if wh.worker_id and wh.hours_worked:
            hours_by_worker[wh.worker_id] += wh.hours_worked
        if wh.work_date:
            work_dates.append(wh.work_date)

    period_start = min(work_dates) if work_dates else None
    period_end = max(work_dates) if work_dates else None

    # 5. Build line items
    line_item_data: list[dict] = []
    total_net = Decimal("0.00")

    for worker_id, total_hours in hours_by_worker.items():
        assignment = assignment_by_worker.get(worker_id)
        if assignment is None:
            logger.debug(
                "[invoice_service] worker %s has no active assignment at client %s — skipping",
                worker_id, batch.client_id,
            )
            continue

        line_net = (total_hours * assignment.employer_rate).quantize(Decimal("0.01"))
        total_net += line_net

        worker = worker_by_id.get(worker_id)
        worker_name = (
            f"{worker.first_name} {worker.last_name}" if worker else str(worker_id)
        )
        description = (
            f"{worker_name} — {assignment.position} — "
            f"{float(total_hours):.2f}h × {float(assignment.employer_rate):.2f} {client.currency.value}"
        )

        line_item_data.append({
            "worker_id": worker_id,
            "assignment_id": assignment.id,
            "description": description,
            "hours_worked": total_hours,
            "unit_rate": assignment.employer_rate,
            "net_amount": line_net,
            "period_start": period_start,
            "period_end": period_end,
        })

    if not line_item_data:
        logger.info(
            "[invoice_service] batch %s: matched hours found but no active assignments — skipping invoice",
            batch.id,
        )
        return None

    # 6. Apply VAT
    if client.currency == Currency.EUR:
        vat_rate = Decimal("0.00")
        vat_amount = Decimal("0.00")
        gross_amount = total_net
    else:
        vat_rate = Decimal("23.00")
        vat_amount = (total_net * Decimal("0.23")).quantize(Decimal("0.01"))
        gross_amount = total_net + vat_amount

    # 7. Generate invoice number (FV/YYYY/###)
    invoice_number = await _next_invoice_number(db)

    # 8. Create Invoice
    now = datetime.now(timezone.utc)
    due_date = now + timedelta(days=client.payment_terms_days)

    period_start_dt = (
        datetime(period_start.year, period_start.month, period_start.day, tzinfo=timezone.utc)
        if period_start else None
    )
    period_end_dt = (
        datetime(period_end.year, period_end.month, period_end.day, tzinfo=timezone.utc)
        if period_end else None
    )

    invoice = Invoice(
        client_id=batch.client_id,
        invoice_number=invoice_number,
        sale_date=now,
        due_date=due_date,
        net_amount=total_net,
        vat_amount=vat_amount,
        gross_amount=gross_amount,
        vat_rate=vat_rate,
        currency=client.currency,
        payment_status=PaymentStatus.pending,
        period_start=period_start_dt,
        period_end=period_end_dt,
    )
    db.add(invoice)
    await db.flush()  # Obtain invoice.id before inserting line items

    # 9. Create InvoiceLineItems
    for item in line_item_data:
        db.add(InvoiceLineItem(
            invoice_id=invoice.id,
            worker_id=item["worker_id"],
            assignment_id=item["assignment_id"],
            description=item["description"],
            hours_worked=item["hours_worked"],
            unit_rate=item["unit_rate"],
            net_amount=item["net_amount"],
            period_start=item["period_start"],
            period_end=item["period_end"],
        ))

    # 10. Backfill assignment_id on WorkerHours rows
    for wh in hours_rows:
        if wh.worker_id and wh.worker_id in assignment_by_worker:
            wh.assignment_id = assignment_by_worker[wh.worker_id].id

    logger.info(
        "[invoice_service] created draft invoice %s (%s) for client %s — net=%s %s, %d line items",
        invoice_number, invoice.id, batch.client_id,
        total_net, client.currency.value, len(line_item_data),
    )
    return invoice


async def _next_invoice_number(db: AsyncSession) -> str:
    """Return the next FV/YYYY/### sequential number for the current year."""
    year = datetime.now(timezone.utc).year
    pattern = f"FV/{year}/%"

    result = await db.execute(
        select(Invoice.invoice_number)
        .where(Invoice.invoice_number.like(pattern))
        .order_by(Invoice.invoice_number.desc())
        .limit(1)
    )
    last: str | None = result.scalar_one_or_none()
    if last:
        try:
            seq = int(last.rsplit("/", 1)[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"FV/{year}/{seq:03d}"
