from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.candidate_reminders import CandidateReminder
from app.models.candidates import Candidate
from app.models.enums import GdprSubjectType, ScreeningStatus
from app.models.workers import Worker
from app.models.gdpr import GdprConsent
from app.schemas.candidates import (
    BulkUpdateRequest,
    CandidateCreate,
    CandidateRead,
    CandidateUpdate,
    DueRemindersCount,
    PaginatedCandidates,
    ReminderCreate,
    ReminderRead,
)

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])


# ---------------------------------------------------------------------------
# Static sub-routes — must come before /{candidate_id} to avoid capture
# ---------------------------------------------------------------------------


@router.get("/reminders/due", response_model=DueRemindersCount)
async def get_due_reminders_count(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DueRemindersCount:
    """Return count of undismissed reminders whose due date has passed."""
    now = datetime.now(tz=timezone.utc)
    result = await db.execute(
        select(func.count())
        .select_from(CandidateReminder)
        .where(CandidateReminder.dismissed.is_(False))
        .where(CandidateReminder.reminder_date <= now)
    )
    count: int = result.scalar_one()
    return DueRemindersCount(due_count=count)


@router.post("/bulk-update", response_model=list[CandidateRead])
async def bulk_update_candidates(
    _: CurrentUser,
    body: BulkUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CandidateRead]:
    """
    Apply a bulk action to a list of candidate IDs.

    Actions:
        set_status      — update screening_status for all selected candidates
        assign_posting  — link all selected candidates to a job posting
        mark_contacted  — set contacted_at = now() for all selected candidates
    """
    if not body.candidate_ids:
        raise HTTPException(status_code=422, detail="candidate_ids must not be empty")

    result = await db.execute(
        select(Candidate).where(Candidate.id.in_(body.candidate_ids))
    )
    candidates = list(result.scalars().all())

    if not candidates:
        raise HTTPException(status_code=404, detail="No matching candidates found")

    now = datetime.now(tz=timezone.utc)

    if body.action == "set_status":
        if body.status_value is None:
            raise HTTPException(
                status_code=422, detail="status_value is required for set_status"
            )
        for c in candidates:
            c.screening_status = body.status_value
            c.updated_at = now

    elif body.action == "assign_posting":
        if body.job_posting_id is None:
            raise HTTPException(
                status_code=422, detail="job_posting_id is required for assign_posting"
            )
        for c in candidates:
            c.job_posting_id = body.job_posting_id
            c.screening_status = ScreeningStatus.hired
            c.updated_at = now
            if c.worker_id is None:
                new_worker = Worker(
                    first_name=c.first_name,
                    last_name=c.last_name,
                    phone=c.phone,
                    email=c.email,
                    nationality=c.nationality,
                    gdpr_consent=c.gdpr_consent,
                    gdpr_consent_at=c.gdpr_consent_at,
                    gdpr_delete_at=None,
                )
                db.add(new_worker)
                await db.flush()
                await db.refresh(new_worker)
                new_worker.gdpr_delete_at = None
                c.worker_id = new_worker.id
                c.gdpr_delete_at = None

    elif body.action == "mark_contacted":
        for c in candidates:
            c.contacted_at = now
            c.updated_at = now

    else:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown action '{body.action}'. Valid: set_status, assign_posting, mark_contacted",
        )

    await db.commit()
    for c in candidates:
        await db.refresh(c)

    return [CandidateRead.model_validate(c) for c in candidates]


# ---------------------------------------------------------------------------
# Collection routes
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedCandidates)
async def list_candidates(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedCandidates:
    offset = (page - 1) * page_size

    total_result = await db.execute(select(func.count()).select_from(Candidate))
    total: int = total_result.scalar_one()

    result = await db.execute(
        select(Candidate).order_by(Candidate.created_at.desc()).offset(offset).limit(page_size)
    )
    items = list(result.scalars().all())

    return PaginatedCandidates(
        items=[CandidateRead.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CandidateRead, status_code=201)
async def create_candidate(
    request: Request,
    body: CandidateCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CandidateRead:
    candidate = Candidate(
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        email=str(body.email) if body.email else None,
        nationality=body.nationality,
        availability_from=datetime.combine(body.availability_from, datetime.min.time()).replace(
            tzinfo=timezone.utc
        ),
        preferred_position=body.preferred_position,
        languages=[lang.value for lang in body.languages],
        location_preference=body.location_preference,
        gdpr_consent=body.gdpr_consent,
        gdpr_consent_at=body.gdpr_consent_at,
    )
    db.add(candidate)
    await db.flush()  # obtain candidate.id before writing GDPR log

    ip_address = request.client.host if request.client else None
    gdpr_log = GdprConsent(
        subject_type=GdprSubjectType.candidate,
        subject_id=candidate.id,
        consent_type="recruitment_processing",
        granted=True,
        ip_address=ip_address,
    )
    db.add(gdpr_log)
    await db.commit()
    await db.refresh(candidate)

    # Trigger WhatsApp screening chatbot — non-blocking, best-effort.
    # A new DB session is needed because background tasks outlive the request session.
    if candidate.phone:
        async def _start_whatsapp_screening(candidate_id: str) -> None:
            import logging as _logging
            _log = _logging.getLogger(__name__)
            try:
                from app.database import AsyncSessionLocal  # noqa: PLC0415
                from app.services.chatbot_fsm import initiate_session  # noqa: PLC0415
                from app.models.enums import ChatbotChannel  # noqa: PLC0415
                async with AsyncSessionLocal() as bg_db:
                    from sqlalchemy import select as _select  # noqa: PLC0415
                    from app.models.candidates import Candidate as _Candidate  # noqa: PLC0415
                    from uuid import UUID as _UUID  # noqa: PLC0415
                    result = await bg_db.execute(
                        _select(_Candidate).where(_Candidate.id == _UUID(candidate_id))
                    )
                    cand = result.scalar_one_or_none()
                    if cand:
                        await initiate_session(cand, bg_db, channel=ChatbotChannel.whatsapp)
            except Exception as _exc:  # noqa: BLE001
                _log.warning("[candidates] WhatsApp session init failed (non-blocking): %s", _exc)

        background_tasks.add_task(_start_whatsapp_screening, str(candidate.id))

    return CandidateRead.model_validate(candidate)


# ---------------------------------------------------------------------------
# Single-candidate routes
# ---------------------------------------------------------------------------


@router.patch("/{candidate_id}", response_model=CandidateRead)
async def update_candidate(
    candidate_id: UUID,
    body: CandidateUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CandidateRead:
    """Update recruiter-editable fields on a candidate (notes, status, posting, contacted)."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")

    now = datetime.now(tz=timezone.utc)
    if body.notes is not None:
        candidate.notes = body.notes
    if body.screening_status is not None:
        candidate.screening_status = body.screening_status
        if body.screening_status == ScreeningStatus.hired and candidate.worker_id is None:
            new_worker = Worker(
                first_name=candidate.first_name,
                last_name=candidate.last_name,
                phone=candidate.phone,
                email=candidate.email,
                nationality=candidate.nationality,
                gdpr_consent=candidate.gdpr_consent,
                gdpr_consent_at=candidate.gdpr_consent_at,
                gdpr_delete_at=None,
            )
            db.add(new_worker)
            await db.flush()
            await db.refresh(new_worker)  # sync trigger-set gdpr_delete_at from DB
            new_worker.gdpr_delete_at = None  # active employee — no deletion scheduled
            candidate.worker_id = new_worker.id
            candidate.gdpr_delete_at = None
    if body.job_posting_id is not None:
        candidate.job_posting_id = body.job_posting_id
    if body.contacted_at is not None:
        candidate.contacted_at = body.contacted_at

    candidate.updated_at = now
    await db.commit()
    await db.refresh(candidate)
    return CandidateRead.model_validate(candidate)


# ---------------------------------------------------------------------------
# Reminder routes
# ---------------------------------------------------------------------------


@router.get("/{candidate_id}/reminders", response_model=list[ReminderRead])
async def list_reminders(
    candidate_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ReminderRead]:
    result = await db.execute(
        select(CandidateReminder)
        .where(CandidateReminder.candidate_id == candidate_id)
        .order_by(CandidateReminder.reminder_date.asc())
    )
    reminders = list(result.scalars().all())
    return [ReminderRead.model_validate(r) for r in reminders]


@router.post("/{candidate_id}/reminders", response_model=ReminderRead, status_code=201)
async def create_reminder(
    candidate_id: UUID,
    body: ReminderCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderRead:
    # Verify candidate exists
    exists = await db.execute(select(Candidate.id).where(Candidate.id == candidate_id))
    if exists.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Candidate not found")

    reminder = CandidateReminder(
        candidate_id=candidate_id,
        reminder_date=body.reminder_date,
        reminder_text=body.reminder_text,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return ReminderRead.model_validate(reminder)


@router.patch("/{candidate_id}/reminders/{reminder_id}", response_model=ReminderRead)
async def dismiss_reminder(
    candidate_id: UUID,
    reminder_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReminderRead:
    result = await db.execute(
        select(CandidateReminder).where(
            CandidateReminder.id == reminder_id,
            CandidateReminder.candidate_id == candidate_id,
        )
    )
    reminder = result.scalar_one_or_none()
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.dismissed = True
    await db.commit()
    await db.refresh(reminder)
    return ReminderRead.model_validate(reminder)
