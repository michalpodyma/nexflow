"""
Celery tasks for transactional and scheduled notifications.

Dispatch tasks (triggered per-event):
    send_welcome_candidate   — welcome email/SMS when a new candidate registers

Scheduled scan tasks (run by Celery Beat daily):
    scan_compliance_expiry   — find workers with expiring documents (30/14/7 days)
                               and notify their email address
    scan_invoice_overdue     — find invoices past due date, flip to overdue,
                               notify client contact email

All DB access uses asyncio.run() over the existing async SQLAlchemy engine.
Errors are caught and logged — tasks never crash the worker process.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

import sqlalchemy as sa

from app.database import AsyncSessionLocal
from app.models.compliance import ComplianceAlert
from app.models.invoices import Invoice
from app.models.notifications import NotificationLog
from app.models.workers import Worker
from app.services.notifications import (
    notify_candidate_welcome_email,
    notify_candidate_welcome_sms,
    notify_compliance_expiry_email,
    notify_invoice_overdue_email,
    notify_invoice_sent_email,
)
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

# Days before expiry at which to send reminders
EXPIRY_REMINDER_DAYS = [30, 14, 7]

# Compliance alert_type → Worker attribute that holds the expiry date
ALERT_TYPE_TO_WORKER_FIELD: dict[str, str] = {
    "health_cert_expiry": "health_cert_expiry",
    "bhp_cert_expiry": "safety_cert_expiry",
    "a1_cert_expiry": "a1_cert_expiry",
    "contract_expiry": "work_permit_expiry",  # best proxy in Phase 1
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _log_notification(
    session_sync_func,
    notification_type: str,
    channel: str,
    recipient: str,
    subject_id: UUID | None,
    subject_type: str | None,
    ok: bool,
    error: str | None = None,
) -> None:
    """Write a NotificationLog row via an async helper called synchronously."""

    async def _write() -> None:
        async with AsyncSessionLocal() as session:
            log = NotificationLog(
                notification_type=notification_type,
                channel=channel,
                recipient=recipient,
                subject_id=subject_id,
                subject_type=subject_type,
                status="sent" if ok else "failed",
                error_message=error,
            )
            session.add(log)
            await session.commit()

    asyncio.run(_write())


# ---------------------------------------------------------------------------
# Dispatch tasks
# ---------------------------------------------------------------------------


@celery_app.task(name="workers.tasks.notifications.send_welcome_candidate")
def send_welcome_candidate(candidate_id: str, phone: str | None, email: str | None) -> None:
    """Send welcome SMS and/or email to a newly registered candidate."""
    cid = UUID(candidate_id)

    async def _get_name() -> tuple[str, str, str]:
        async with AsyncSessionLocal() as session:
            from app.models.candidates import Candidate

            row = await session.get(Candidate, cid)
            if row is None:
                return ("", "", "")
            return (
                row.first_name,
                row.email or email or "",
                row.phone or phone or "",
            )

    result = asyncio.run(_get_name())
    if not result or result[0] == "":
        logger.warning("[notifications] send_welcome_candidate: candidate %s not found", candidate_id)
        return

    first_name, resolved_email, resolved_phone = result

    if resolved_phone:
        ok = notify_candidate_welcome_sms(resolved_phone, first_name)
        _log_notification(
            None,
            "welcome_candidate",
            "sms",
            resolved_phone,
            cid,
            "candidate",
            ok,
        )

    if resolved_email:
        ok = notify_candidate_welcome_email(resolved_email, first_name)
        _log_notification(
            None,
            "welcome_candidate",
            "email",
            resolved_email,
            cid,
            "candidate",
            ok,
        )


@celery_app.task(name="workers.tasks.notifications.send_invoice_sent")
def send_invoice_sent(invoice_id: str) -> None:
    """Notify client when an invoice is issued."""

    async def _run() -> None:
        async with AsyncSessionLocal() as session:
            from app.models.clients import Client

            inv = await session.get(Invoice, UUID(invoice_id))
            if inv is None:
                logger.warning("[notifications] send_invoice_sent: invoice %s not found", invoice_id)
                return
            client = await session.get(Client, inv.client_id)
            if client is None or not client.email:
                logger.info(
                    "[notifications] send_invoice_sent: client has no email for invoice %s",
                    invoice_id,
                )
                return

            due_str = inv.due_date.strftime("%Y-%m-%d")
            ok = notify_invoice_sent_email(
                to_email=client.email,
                client_name=client.company_name,
                invoice_number=inv.invoice_number,
                gross_amount=str(inv.gross_amount),
                currency=inv.currency.value,
                due_date_str=due_str,
            )
            log = NotificationLog(
                notification_type="invoice_sent",
                channel="email",
                recipient=client.email,
                subject_id=inv.id,
                subject_type="invoice",
                status="sent" if ok else "failed",
            )
            session.add(log)
            await session.commit()

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Scheduled scan tasks (run by Celery Beat)
# ---------------------------------------------------------------------------


@celery_app.task(name="workers.tasks.notifications.scan_compliance_expiry")
def scan_compliance_expiry() -> None:
    """
    Daily task: for each unacknowledged compliance alert, check if the worker's
    expiry date falls on a 30/14/7-day boundary and send an email to the worker.
    """

    async def _run() -> None:
        now = datetime.now(UTC)
        async with AsyncSessionLocal() as session:
            # Load unacknowledged alerts with worker data
            stmt = (
                sa.select(ComplianceAlert, Worker)
                .join(Worker, Worker.id == ComplianceAlert.worker_id)
                .where(ComplianceAlert.acknowledged == sa.false())
            )
            rows = (await session.execute(stmt)).all()

            for alert, worker in rows:
                if not worker.email:
                    continue
                days_remaining = (alert.due_date.replace(tzinfo=UTC) - now).days
                if days_remaining not in EXPIRY_REMINDER_DAYS:
                    continue

                due_str = alert.due_date.strftime("%Y-%m-%d")
                ok = notify_compliance_expiry_email(
                    to_email=worker.email,
                    first_name=worker.first_name,
                    last_name=worker.last_name,
                    alert_type=alert.alert_type.value,
                    due_date_str=due_str,
                    days_remaining=days_remaining,
                )
                log = NotificationLog(
                    notification_type="compliance_expiry",
                    channel="email",
                    recipient=worker.email,
                    subject_id=alert.worker_id,
                    subject_type="worker",
                    status="sent" if ok else "failed",
                )
                session.add(log)

            await session.commit()

    asyncio.run(_run())


@celery_app.task(name="workers.tasks.notifications.scan_invoice_overdue")
def scan_invoice_overdue() -> None:
    """
    Daily task: find pending invoices past their due date, flip status to overdue,
    and email the client.
    """

    async def _run() -> None:
        from app.models.clients import Client
        from app.models.enums import PaymentStatus

        now = datetime.now(UTC)
        async with AsyncSessionLocal() as session:
            stmt = (
                sa.select(Invoice, Client)
                .join(Client, Client.id == Invoice.client_id)
                .where(
                    Invoice.payment_status == PaymentStatus.pending,
                    Invoice.due_date < now,
                )
            )
            rows = (await session.execute(stmt)).all()

            for inv, client in rows:
                # Flip status
                inv.payment_status = PaymentStatus.overdue

                if client.email:
                    due_str = inv.due_date.strftime("%Y-%m-%d")
                    ok = notify_invoice_overdue_email(
                        to_email=client.email,
                        client_name=client.company_name,
                        invoice_number=inv.invoice_number,
                        gross_amount=str(inv.gross_amount),
                        currency=inv.currency.value,
                        due_date_str=due_str,
                    )
                    log = NotificationLog(
                        notification_type="invoice_overdue",
                        channel="email",
                        recipient=client.email,
                        subject_id=inv.id,
                        subject_type="invoice",
                        status="sent" if ok else "failed",
                    )
                    session.add(log)

            await session.commit()

    asyncio.run(_run())
