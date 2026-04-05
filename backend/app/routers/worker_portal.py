"""
Worker self-service portal API.

All endpoints under /api/v1/worker — authentication uses phone OTP with
worker-scoped JWTs distinct from admin JWTs.

Auth flow:
    POST /auth/request-otp  → sends 6-digit SMS code (10 min TTL)
    POST /auth/verify-otp   → verifies code, returns worker access token + refresh cookie
    POST /auth/refresh       → rotates refresh cookie, returns new access token
    POST /auth/logout        → revokes refresh token

Protected worker endpoints (require Bearer worker access token):
    GET    /me                          → profile
    PATCH  /me                          → update phone/email/bank_account
    DELETE /me/gdpr                     → request GDPR data deletion
    GET    /dashboard                   → assignment + next shift + compliance warnings
    GET    /payslips                    → list payslip periods
    GET    /payslips/{year}/{month}     → period detail with daily breakdown
    GET    /schedule                    → upcoming shifts (next 30 days)
    GET    /documents                   → list generated documents (final/signed only)
    GET    /documents/{doc_id}/download → stream PDF
"""

import random
import secrets
import string
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated
from uuid import UUID

import redis.asyncio as aioredis
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import Response as FastAPIResponse
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.worker_auth import (
    CurrentWorker,
    clear_worker_refresh_cookie,
    create_worker_access_token,
    create_worker_refresh_token,
    refresh_worker_token,
    set_worker_refresh_cookie,
)
from app.config import settings
from app.database import get_db
from app.models.assignments import Assignment
from app.models.clients import Client
from app.models.compliance import ComplianceAlert
from app.models.documents import GeneratedDocument
from app.models.hours_import import WorkerHours
from app.models.shifts import ShiftEntry
from app.models.worker_otp import WorkerOTP
from app.models.workers import Worker
from app.services.notifications import send_sms

router = APIRouter(prefix="/api/v1/worker", tags=["worker-portal"])

_OTP_TTL_SECONDS = 600  # 10 minutes
_OTP_MAX_ATTEMPTS_KEY = "worker_otp_attempts:{phone}"
_OTP_MAX_ATTEMPTS = 5
_OTP_ATTEMPTS_WINDOW = 3600  # 1 hour


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class OTPRequest(BaseModel):
    phone: str = Field(..., description="E.164 phone number, e.g. +48501234567")


class OTPVerify(BaseModel):
    phone: str
    code: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class WorkerProfile(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone: str | None
    email: str | None
    nationality: str | None
    bank_account: str | None
    attendance_status: str
    gdpr_consent: bool
    gdpr_consent_at: datetime | None


class WorkerProfileUpdate(BaseModel):
    phone: str | None = None
    email: str | None = None
    bank_account: str | None = None


class ComplianceWarning(BaseModel):
    alert_type: str
    due_date: datetime
    days_remaining: int


class CurrentAssignment(BaseModel):
    id: UUID
    client_name: str
    position: str
    start_date: datetime
    end_date: datetime | None
    worker_rate: Decimal


class NextShift(BaseModel):
    id: UUID
    shift_date: date
    start_dt: datetime
    end_dt: datetime
    client_name: str
    notes: str | None


class DashboardResponse(BaseModel):
    worker_name: str
    current_assignment: CurrentAssignment | None
    next_shift: NextShift | None
    compliance_warnings: list[ComplianceWarning]


class PayslipPeriod(BaseModel):
    year: int
    month: int
    total_hours: Decimal
    total_pay: Decimal
    currency: str = "PLN"


class PayslipDay(BaseModel):
    work_date: date
    hours_worked: Decimal
    overtime_hours: Decimal
    daily_pay: Decimal


class PayslipDetail(BaseModel):
    year: int
    month: int
    worker_rate: Decimal
    total_hours: Decimal
    overtime_hours: Decimal
    total_pay: Decimal
    currency: str = "PLN"
    days: list[PayslipDay]


class UpcomingShift(BaseModel):
    id: UUID
    shift_date: date
    start_dt: datetime
    end_dt: datetime
    client_name: str
    notes: str | None


class DocumentSummary(BaseModel):
    id: UUID
    template_name: str
    status: str
    created_at: datetime
    has_pdf: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


async def _check_rate_limit(phone: str) -> None:
    """Raise 429 if too many OTP attempts within the window."""
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        key = _OTP_MAX_ATTEMPTS_KEY.format(phone=phone)
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, _OTP_ATTEMPTS_WINDOW)
        if count > _OTP_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests. Try again in 1 hour.",
            )
    finally:
        await redis.aclose()


# ---------------------------------------------------------------------------
# Auth endpoints (no worker auth required)
# ---------------------------------------------------------------------------


@router.post("/auth/request-otp", status_code=status.HTTP_204_NO_CONTENT)
async def request_otp(
    body: OTPRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """
    Send a 6-digit OTP via SMS to the worker's registered phone number.

    If the phone is not found in the workers table we return 204 silently
    (no enumeration). The OTP is only useful if the worker exists.
    """
    await _check_rate_limit(body.phone)

    # Look up worker — silent 204 whether found or not (prevent enumeration)
    result = await db.execute(
        select(Worker).where(
            Worker.phone == body.phone,
            Worker.archived_at.is_(None),
        )
    )
    worker: Worker | None = result.scalar_one_or_none()

    if worker is None:
        # Silent — don't reveal whether the phone is registered
        return

    code = _generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_OTP_TTL_SECONDS)
    otp = WorkerOTP(phone=body.phone, code=code, expires_at=expires_at)
    db.add(otp)
    await db.commit()

    # Send SMS — fire and forget (non-blocking; errors are logged by send_sms)
    message = f"Nexflow: Twój kod logowania to {code}. Ważny 10 minut. Nie udostępniaj nikomu."
    send_sms(body.phone, message)


@router.post("/auth/verify-otp", response_model=TokenResponse)
async def verify_otp(
    body: OTPVerify,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Verify OTP and return a worker access token (+ set refresh cookie)."""
    now = datetime.now(timezone.utc)

    # Find a valid, unused OTP for this phone
    result = await db.execute(
        select(WorkerOTP).where(
            WorkerOTP.phone == body.phone,
            WorkerOTP.code == body.code,
            WorkerOTP.used_at.is_(None),
            WorkerOTP.expires_at > now,
        )
    )
    otp: WorkerOTP | None = result.scalar_one_or_none()

    if otp is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired code",
        )

    # Find the worker
    worker_result = await db.execute(
        select(Worker).where(
            Worker.phone == body.phone,
            Worker.archived_at.is_(None),
        )
    )
    worker: Worker | None = worker_result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Worker not found",
        )

    # Mark OTP as used
    otp.used_at = now
    await db.commit()

    jti = str(uuid.uuid4())
    access_token = create_worker_access_token(worker.id)
    refresh_token = create_worker_refresh_token(worker.id, jti)

    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        ttl = settings.refresh_token_expire_days * 86400
        await redis.setex(f"worker_refresh:{jti}", ttl, str(worker.id))
    finally:
        await redis.aclose()

    set_worker_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/auth/refresh", response_model=TokenResponse)
async def worker_token_refresh(
    response: Response,
    nexflow_worker_refresh: Annotated[str | None, Cookie()] = None,
) -> TokenResponse:
    """Rotate worker refresh token and return a new access token."""
    access_token = await refresh_worker_token(nexflow_worker_refresh, response)
    return TokenResponse(access_token=access_token)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def worker_logout(
    response: Response,
    nexflow_worker_refresh: Annotated[str | None, Cookie()] = None,
) -> None:
    """Revoke worker refresh token."""
    if nexflow_worker_refresh:
        from jose import JWTError, jwt

        try:
            payload = jwt.decode(
                nexflow_worker_refresh,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            jti: str | None = payload.get("jti")
            if jti:
                redis = aioredis.from_url(settings.redis_url, decode_responses=True)
                try:
                    await redis.delete(f"worker_refresh:{jti}")
                finally:
                    await redis.aclose()
        except JWTError:
            pass
    clear_worker_refresh_cookie(response)


# ---------------------------------------------------------------------------
# Profile endpoints
# ---------------------------------------------------------------------------


@router.get("/me", response_model=WorkerProfile)
async def get_worker_profile(
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkerProfile:
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker: Worker | None = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    return WorkerProfile(
        id=worker.id,
        first_name=worker.first_name,
        last_name=worker.last_name,
        phone=worker.phone,
        email=worker.email,
        nationality=worker.nationality,
        bank_account=worker.bank_account,
        attendance_status=worker.attendance_status.value,
        gdpr_consent=worker.gdpr_consent,
        gdpr_consent_at=worker.gdpr_consent_at,
    )


@router.patch("/me", response_model=WorkerProfile)
async def update_worker_profile(
    body: WorkerProfileUpdate,
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WorkerProfile:
    """Update contact details and bank account. Workers can only update their own record."""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker: Worker | None = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    if body.phone is not None:
        worker.phone = body.phone
    if body.email is not None:
        worker.email = body.email
    if body.bank_account is not None:
        worker.bank_account = body.bank_account

    worker.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return WorkerProfile(
        id=worker.id,
        first_name=worker.first_name,
        last_name=worker.last_name,
        phone=worker.phone,
        email=worker.email,
        nationality=worker.nationality,
        bank_account=worker.bank_account,
        attendance_status=worker.attendance_status.value,
        gdpr_consent=worker.gdpr_consent,
        gdpr_consent_at=worker.gdpr_consent_at,
    )


@router.delete("/me/gdpr", status_code=status.HTTP_204_NO_CONTENT)
async def request_gdpr_deletion(
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """
    Request erasure of personal data (GDPR Article 17).

    Sets gdpr_delete_at to now+7 days to give ops a window to review.
    The worker record and all associated PII will be purged by the GDPR
    cleanup task once that date passes.
    """
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker: Worker | None = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    # Give ops 7 days to review before permanent deletion
    worker.gdpr_delete_at = datetime.now(timezone.utc) + timedelta(days=7)
    worker.updated_at = datetime.now(timezone.utc)
    await db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardResponse:
    """Return the worker's current assignment, next upcoming shift, and active compliance warnings."""
    result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker: Worker | None = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    # Current active assignment
    current_assignment: CurrentAssignment | None = None
    assignment_result = await db.execute(
        select(Assignment, Client)
        .join(Client, Assignment.client_id == Client.id)
        .where(
            Assignment.worker_id == worker_id,
            Assignment.is_active.is_(True),
        )
        .order_by(Assignment.start_date.desc())
        .limit(1)
    )
    row = assignment_result.first()
    if row:
        asgn, client = row
        current_assignment = CurrentAssignment(
            id=asgn.id,
            client_name=client.company_name,
            position=asgn.position,
            start_date=asgn.start_date,
            end_date=asgn.end_date,
            worker_rate=asgn.worker_rate,
        )

    # Next shift (from today onwards)
    today = date.today()
    shift_result = await db.execute(
        select(ShiftEntry, Client)
        .join(Client, ShiftEntry.client_id == Client.id)
        .where(
            ShiftEntry.worker_id == worker_id,
            ShiftEntry.shift_date >= today,
        )
        .order_by(ShiftEntry.start_dt.asc())
        .limit(1)
    )
    next_shift_row = shift_result.first()
    next_shift: NextShift | None = None
    if next_shift_row:
        se, sc = next_shift_row
        next_shift = NextShift(
            id=se.id,
            shift_date=se.shift_date,
            start_dt=se.start_dt,
            end_dt=se.end_dt,
            client_name=sc.company_name,
            notes=se.notes,
        )

    # Active (unacknowledged) compliance alerts
    alerts_result = await db.execute(
        select(ComplianceAlert).where(
            ComplianceAlert.worker_id == worker_id,
            ComplianceAlert.acknowledged.is_(False),
        )
    )
    warnings: list[ComplianceWarning] = []
    now = datetime.now(timezone.utc)
    for alert in alerts_result.scalars().all():
        days_remaining = (alert.due_date.replace(tzinfo=timezone.utc) - now).days
        warnings.append(
            ComplianceWarning(
                alert_type=alert.alert_type.value,
                due_date=alert.due_date,
                days_remaining=days_remaining,
            )
        )

    return DashboardResponse(
        worker_name=f"{worker.first_name} {worker.last_name}",
        current_assignment=current_assignment,
        next_shift=next_shift,
        compliance_warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Payslips
# ---------------------------------------------------------------------------


@router.get("/payslips", response_model=list[PayslipPeriod])
async def list_payslips(
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PayslipPeriod]:
    """
    List monthly payslip summaries derived from committed WorkerHours records
    combined with the worker_rate from the active assignment at that time.
    """
    # Get all committed hours for this worker (match_status='matched')
    hours_result = await db.execute(
        select(WorkerHours).where(
            WorkerHours.worker_id == worker_id,
            WorkerHours.match_status == "matched",
            WorkerHours.work_date.isnot(None),
            WorkerHours.hours_worked.isnot(None),
        )
    )
    hours_rows = hours_result.scalars().all()

    if not hours_rows:
        return []

    # Get all assignments for this worker to look up worker_rate by date
    assignments_result = await db.execute(
        select(Assignment).where(
            Assignment.worker_id == worker_id,
        ).order_by(Assignment.start_date.asc())
    )
    assignments = assignments_result.scalars().all()

    def _rate_for_date(d: date) -> Decimal:
        """Return worker_rate from the assignment active on a given date."""
        for asgn in reversed(assignments):
            if asgn.start_date.date() <= d:
                if asgn.end_date is None or asgn.end_date.date() >= d:
                    return asgn.worker_rate
        return Decimal("0")

    # Group by (year, month)
    periods: dict[tuple[int, int], dict] = {}
    for row in hours_rows:
        assert row.work_date is not None
        ym = (row.work_date.year, row.work_date.month)
        if ym not in periods:
            periods[ym] = {"hours": Decimal("0"), "pay": Decimal("0")}
        h = row.hours_worked or Decimal("0")
        rate = _rate_for_date(row.work_date)
        periods[ym]["hours"] += h
        periods[ym]["pay"] += h * rate

    return [
        PayslipPeriod(
            year=y,
            month=m,
            total_hours=periods[(y, m)]["hours"],
            total_pay=periods[(y, m)]["pay"],
        )
        for y, m in sorted(periods.keys(), reverse=True)
    ]


@router.get("/payslips/{year}/{month}", response_model=PayslipDetail)
async def get_payslip(
    year: int,
    month: int,
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PayslipDetail:
    """Return day-level breakdown for a specific month."""
    from calendar import monthrange

    _, last_day = monthrange(year, month)
    period_start = date(year, month, 1)
    period_end = date(year, month, last_day)

    hours_result = await db.execute(
        select(WorkerHours).where(
            WorkerHours.worker_id == worker_id,
            WorkerHours.match_status == "matched",
            WorkerHours.work_date >= period_start,
            WorkerHours.work_date <= period_end,
            WorkerHours.hours_worked.isnot(None),
        ).order_by(WorkerHours.work_date.asc())
    )
    hours_rows = hours_result.scalars().all()

    assignments_result = await db.execute(
        select(Assignment).where(Assignment.worker_id == worker_id)
        .order_by(Assignment.start_date.asc())
    )
    assignments = assignments_result.scalars().all()

    def _rate_for_date(d: date) -> Decimal:
        for asgn in reversed(assignments):
            if asgn.start_date.date() <= d:
                if asgn.end_date is None or asgn.end_date.date() >= d:
                    return asgn.worker_rate
        return Decimal("0")

    days: list[PayslipDay] = []
    total_hours = Decimal("0")
    total_overtime = Decimal("0")
    total_pay = Decimal("0")
    worker_rate = Decimal("0")

    for row in hours_rows:
        assert row.work_date is not None
        h = row.hours_worked or Decimal("0")
        ot = row.overtime_hours or Decimal("0")
        rate = _rate_for_date(row.work_date)
        worker_rate = rate  # last seen rate — fine for single-assignment periods
        daily_pay = h * rate
        days.append(
            PayslipDay(
                work_date=row.work_date,
                hours_worked=h,
                overtime_hours=ot,
                daily_pay=daily_pay,
            )
        )
        total_hours += h
        total_overtime += ot
        total_pay += daily_pay

    return PayslipDetail(
        year=year,
        month=month,
        worker_rate=worker_rate,
        total_hours=total_hours,
        overtime_hours=total_overtime,
        total_pay=total_pay,
        days=days,
    )


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------


@router.get("/schedule", response_model=list[UpcomingShift])
async def get_schedule(
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[UpcomingShift]:
    """Return upcoming shifts for the next 30 days."""
    today = date.today()
    end_date = today + timedelta(days=30)

    result = await db.execute(
        select(ShiftEntry, Client)
        .join(Client, ShiftEntry.client_id == Client.id)
        .where(
            ShiftEntry.worker_id == worker_id,
            ShiftEntry.shift_date >= today,
            ShiftEntry.shift_date <= end_date,
        )
        .order_by(ShiftEntry.start_dt.asc())
    )

    return [
        UpcomingShift(
            id=se.id,
            shift_date=se.shift_date,
            start_dt=se.start_dt,
            end_dt=se.end_dt,
            client_name=cl.company_name,
            notes=se.notes,
        )
        for se, cl in result.all()
    ]


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


@router.get("/documents", response_model=list[DocumentSummary])
async def list_documents(
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DocumentSummary]:
    """List finalized documents the worker can download."""
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.worker_id == worker_id,
            GeneratedDocument.status.in_(["final", "signed"]),
        ).order_by(GeneratedDocument.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        DocumentSummary(
            id=doc.id,
            template_name=doc.template_name_snapshot,
            status=doc.status.value,
            created_at=doc.created_at,
            has_pdf=doc.pdf_data is not None,
        )
        for doc in docs
    ]


@router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: UUID,
    worker_id: CurrentWorker,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FastAPIResponse:
    """Stream the PDF of a finalized document. Returns 404 if not owned by the worker."""
    result = await db.execute(
        select(GeneratedDocument).where(
            GeneratedDocument.id == doc_id,
            GeneratedDocument.worker_id == worker_id,
            GeneratedDocument.status.in_(["final", "signed"]),
        )
    )
    doc: GeneratedDocument | None = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.pdf_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not yet generated for this document",
        )

    filename = f"{doc.template_name_snapshot.replace(' ', '_')}.pdf"
    return FastAPIResponse(
        content=doc.pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
