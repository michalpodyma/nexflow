from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.celery_client import celery_client
from app.database import get_db
from app.models.candidates import Candidate
from app.models.enums import GdprSubjectType
from app.models.gdpr import GdprConsent
from app.schemas.candidates import CandidateCreate, CandidateRead, PaginatedCandidates

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])


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

    # Phase 1 stub: queue SMS confirmation (task registered in workers container)
    celery_client.send_task(
        "workers.tasks.candidates.send_sms_confirmation",
        args=[str(candidate.id), candidate.phone],
    )

    return CandidateRead.model_validate(candidate)
