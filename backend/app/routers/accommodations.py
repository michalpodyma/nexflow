from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.accommodations import Accommodation, AccommodationAssignment
from app.models.workers import Worker
from app.schemas.accommodations import (
    AccommodationCreate,
    AccommodationDetail,
    AccommodationUpdate,
    AccommodationWithOccupancy,
    AssignmentCreate,
    AssignmentRead,
    AssignmentUpdate,
    PaginatedAccommodations,
    ResidentSummary,
)

router = APIRouter(prefix="/api/v1/accommodations", tags=["accommodations"])
assignments_router = APIRouter(
    prefix="/api/v1/accommodation-assignments", tags=["accommodations"]
)


async def _occupancy(db: AsyncSession, accommodation_id: UUID) -> int:
    """Count workers currently assigned (no move_out_date)."""
    result = await db.execute(
        select(func.count())
        .select_from(AccommodationAssignment)
        .where(
            AccommodationAssignment.accommodation_id == accommodation_id,
            AccommodationAssignment.move_out_date.is_(None),
        )
    )
    return result.scalar_one()


@router.get("", response_model=PaginatedAccommodations)
async def list_accommodations(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = Query(False, description="Filter to active accommodations only"),
) -> PaginatedAccommodations:
    base_q = select(Accommodation)
    if active_only:
        base_q = base_q.where(Accommodation.is_active.is_(True))

    total_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total: int = total_result.scalar_one()

    result = await db.execute(
        base_q.order_by(Accommodation.name).offset((page - 1) * page_size).limit(page_size)
    )
    accommodations = list(result.scalars().all())

    items = []
    for acc in accommodations:
        occ = await _occupancy(db, acc.id)
        data = AccommodationWithOccupancy.model_validate(acc)
        data.current_occupancy = occ
        items.append(data)

    return PaginatedAccommodations(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=AccommodationWithOccupancy, status_code=201)
async def create_accommodation(
    body: AccommodationCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AccommodationWithOccupancy:
    acc = Accommodation(**body.model_dump())
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    data = AccommodationWithOccupancy.model_validate(acc)
    data.current_occupancy = 0
    return data


@router.get("/{accommodation_id}", response_model=AccommodationDetail)
async def get_accommodation(
    accommodation_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AccommodationDetail:
    result = await db.execute(
        select(Accommodation).where(Accommodation.id == accommodation_id)
    )
    acc = result.scalar_one_or_none()
    if acc is None:
        raise HTTPException(status_code=404, detail="Accommodation not found")

    # Fetch current residents with worker names
    residents_result = await db.execute(
        select(AccommodationAssignment, Worker.first_name, Worker.last_name)
        .join(Worker, AccommodationAssignment.worker_id == Worker.id)
        .where(
            AccommodationAssignment.accommodation_id == accommodation_id,
            AccommodationAssignment.move_out_date.is_(None),
        )
        .order_by(AccommodationAssignment.move_in_date.desc())
    )
    rows = residents_result.all()
    residents = [
        ResidentSummary(
            worker_id=asgn.worker_id,
            worker_name=f"{first} {last}",
            room_number=asgn.room_number,
            move_in_date=asgn.move_in_date,
            move_out_date=asgn.move_out_date,
            monthly_cost_to_worker=asgn.monthly_cost_to_worker,
            assignment_id=asgn.id,
        )
        for asgn, first, last in rows
    ]

    detail = AccommodationDetail.model_validate(acc)
    detail.current_occupancy = len(residents)
    detail.residents = residents
    return detail


@router.patch("/{accommodation_id}", response_model=AccommodationWithOccupancy)
async def update_accommodation(
    accommodation_id: UUID,
    body: AccommodationUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AccommodationWithOccupancy:
    result = await db.execute(
        select(Accommodation).where(Accommodation.id == accommodation_id)
    )
    acc = result.scalar_one_or_none()
    if acc is None:
        raise HTTPException(status_code=404, detail="Accommodation not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(acc, field, value)

    await db.commit()
    await db.refresh(acc)
    occ = await _occupancy(db, acc.id)
    data = AccommodationWithOccupancy.model_validate(acc)
    data.current_occupancy = occ
    return data


@router.post("/{accommodation_id}/assign", response_model=AssignmentRead, status_code=201)
async def assign_worker(
    accommodation_id: UUID,
    body: AssignmentCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AssignmentRead:
    # Verify accommodation exists
    acc_result = await db.execute(
        select(Accommodation).where(Accommodation.id == accommodation_id)
    )
    acc = acc_result.scalar_one_or_none()
    if acc is None:
        raise HTTPException(status_code=404, detail="Accommodation not found")

    # Verify worker exists
    worker_result = await db.execute(
        select(Worker).where(Worker.id == body.worker_id)
    )
    if worker_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Check capacity — count current residents
    occ = await _occupancy(db, accommodation_id)
    if occ >= acc.total_capacity:
        raise HTTPException(
            status_code=409,
            detail=f"Accommodation is at full capacity ({acc.total_capacity} beds)",
        )

    asgn = AccommodationAssignment(
        accommodation_id=accommodation_id,
        **body.model_dump(),
    )
    db.add(asgn)
    await db.commit()
    await db.refresh(asgn)
    return AssignmentRead.model_validate(asgn)


# ── Assignment management ─────────────────────────────────────────────────────

@assignments_router.patch("/{assignment_id}", response_model=AssignmentRead)
async def update_assignment(
    assignment_id: UUID,
    body: AssignmentUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AssignmentRead:
    result = await db.execute(
        select(AccommodationAssignment).where(AccommodationAssignment.id == assignment_id)
    )
    asgn = result.scalar_one_or_none()
    if asgn is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(asgn, field, value)

    await db.commit()
    await db.refresh(asgn)
    return AssignmentRead.model_validate(asgn)
