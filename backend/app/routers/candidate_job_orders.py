from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.candidate_job_orders import CandidateJobOrder
from app.models.candidates import Candidate
from app.models.enums import CandidateJobOrderStatus, ScreeningStatus
from app.models.job_orders import JobOrder
from app.models.workers import Worker
from app.schemas.candidate_job_orders import (
    CandidateJobOrderCreate,
    CandidateJobOrderRead,
    CandidateJobOrderUpdate,
    PaginatedCandidateJobOrders,
)

router = APIRouter(tags=["candidate-job-orders"])


@router.post(
    "/api/v1/candidates/{candidate_id}/job-orders",
    response_model=CandidateJobOrderRead,
    status_code=201,
)
async def assign_candidate_to_job_order(
    candidate_id: UUID,
    body: CandidateJobOrderCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CandidateJobOrderRead:
    # Verify candidate and job order exist
    candidate = await db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    job_order = await db.get(JobOrder, body.job_order_id)
    if job_order is None:
        raise HTTPException(status_code=404, detail="Job order not found")

    # Check for duplicate
    existing = await db.execute(
        select(CandidateJobOrder).where(
            CandidateJobOrder.candidate_id == candidate_id,
            CandidateJobOrder.job_order_id == body.job_order_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Candidate already assigned to this job order")

    link = CandidateJobOrder(
        candidate_id=candidate_id,
        job_order_id=body.job_order_id,
        status=body.status,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return CandidateJobOrderRead.model_validate(link)


@router.get(
    "/api/v1/candidates/{candidate_id}/job-orders",
    response_model=PaginatedCandidateJobOrders,
)
async def list_job_orders_for_candidate(
    candidate_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PaginatedCandidateJobOrders:
    offset = (page - 1) * page_size

    count_q = select(func.count()).select_from(CandidateJobOrder).where(
        CandidateJobOrder.candidate_id == candidate_id
    )
    total: int = (await db.execute(count_q)).scalar_one()

    items_q = (
        select(CandidateJobOrder)
        .where(CandidateJobOrder.candidate_id == candidate_id)
        .order_by(CandidateJobOrder.submitted_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = list((await db.execute(items_q)).scalars().all())

    return PaginatedCandidateJobOrders(
        items=[CandidateJobOrderRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/api/v1/job-orders/{job_order_id}/candidates",
    response_model=PaginatedCandidateJobOrders,
)
async def list_candidates_for_job_order(
    job_order_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> PaginatedCandidateJobOrders:
    offset = (page - 1) * page_size

    count_q = select(func.count()).select_from(CandidateJobOrder).where(
        CandidateJobOrder.job_order_id == job_order_id
    )
    total: int = (await db.execute(count_q)).scalar_one()

    items_q = (
        select(CandidateJobOrder)
        .where(CandidateJobOrder.job_order_id == job_order_id)
        .order_by(CandidateJobOrder.submitted_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = list((await db.execute(items_q)).scalars().all())

    return PaginatedCandidateJobOrders(
        items=[CandidateJobOrderRead.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch(
    "/api/v1/candidates/{candidate_id}/job-orders/{job_order_id}",
    response_model=CandidateJobOrderRead,
)
async def update_candidate_job_order_status(
    candidate_id: UUID,
    job_order_id: UUID,
    body: CandidateJobOrderUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CandidateJobOrderRead:
    result = await db.execute(
        select(CandidateJobOrder).where(
            CandidateJobOrder.candidate_id == candidate_id,
            CandidateJobOrder.job_order_id == job_order_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    link.status = body.status

    # When a candidate is placed, promote them to a Worker (if not already one).
    if body.status == CandidateJobOrderStatus.placed:
        candidate = await db.get(Candidate, candidate_id)
        if candidate is not None:
            candidate.screening_status = ScreeningStatus.hired
            candidate.gdpr_delete_at = None  # active employee — clear auto-deletion

            if candidate.worker_id is None:
                worker = Worker(
                    first_name=candidate.first_name,
                    last_name=candidate.last_name,
                    phone=candidate.phone,
                    email=candidate.email,
                    nationality=candidate.nationality,
                    gdpr_consent=candidate.gdpr_consent,
                    gdpr_consent_at=candidate.gdpr_consent_at,
                    gdpr_delete_at=None,  # active employee — clear trigger-set auto-deletion
                )
                db.add(worker)
                await db.flush()
                await db.refresh(worker)
                candidate.worker_id = worker.id

    await db.commit()
    await db.refresh(link)
    return CandidateJobOrderRead.model_validate(link)
