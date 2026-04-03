from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.transport import TransportAssignment, TransportRoute, Vehicle
from app.models.workers import Worker
from app.schemas.transport import (
    PaginatedRoutes,
    PaginatedVehicles,
    RouteCreate,
    RoutePassenger,
    RouteUpdate,
    RouteWithWorkerCount,
    TransportAssignCreate,
    TransportAssignmentRead,
    TransportAssignmentUpdate,
    VehicleCreate,
    VehicleRead,
    VehicleUpdate,
)

vehicles_router = APIRouter(prefix="/api/v1/vehicles", tags=["transport"])
routes_router = APIRouter(prefix="/api/v1/transport-routes", tags=["transport"])
assignments_router = APIRouter(
    prefix="/api/v1/transport-assignments", tags=["transport"]
)


async def _active_worker_count(db: AsyncSession, route_id: UUID) -> int:
    """Count workers currently on a route (no end_date)."""
    result = await db.execute(
        select(func.count())
        .select_from(TransportAssignment)
        .where(
            TransportAssignment.route_id == route_id,
            TransportAssignment.end_date.is_(None),
        )
    )
    return result.scalar_one()


# ── Vehicles ──────────────────────────────────────────────────────────────────

@vehicles_router.get("", response_model=PaginatedVehicles)
async def list_vehicles(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = Query(False),
) -> PaginatedVehicles:
    base_q = select(Vehicle)
    if active_only:
        base_q = base_q.where(Vehicle.is_active.is_(True))

    total_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total: int = total_result.scalar_one()

    result = await db.execute(
        base_q.order_by(Vehicle.make, Vehicle.model)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    vehicles = list(result.scalars().all())
    return PaginatedVehicles(
        items=[VehicleRead.model_validate(v) for v in vehicles],
        total=total,
        page=page,
        page_size=page_size,
    )


@vehicles_router.post("", response_model=VehicleRead, status_code=201)
async def create_vehicle(
    body: VehicleCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VehicleRead:
    vehicle = Vehicle(**body.model_dump())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return VehicleRead.model_validate(vehicle)


@vehicles_router.put("/{vehicle_id}", response_model=VehicleRead)
async def update_vehicle(
    vehicle_id: UUID,
    body: VehicleUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VehicleRead:
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)

    await db.commit()
    await db.refresh(vehicle)
    return VehicleRead.model_validate(vehicle)


# ── Routes ────────────────────────────────────────────────────────────────────

@routes_router.get("", response_model=PaginatedRoutes)
async def list_routes(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = Query(False),
) -> PaginatedRoutes:
    base_q = select(TransportRoute)
    if active_only:
        base_q = base_q.where(TransportRoute.is_active.is_(True))

    total_result = await db.execute(select(func.count()).select_from(base_q.subquery()))
    total: int = total_result.scalar_one()

    result = await db.execute(
        base_q.order_by(TransportRoute.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    routes = list(result.scalars().all())

    items = []
    for route in routes:
        count = await _active_worker_count(db, route.id)

        # Resolve vehicle plate
        plate: str | None = None
        if route.vehicle_id:
            v_result = await db.execute(
                select(Vehicle.license_plate).where(Vehicle.id == route.vehicle_id)
            )
            plate = v_result.scalar_one_or_none()

        # Resolve driver name
        driver: str | None = None
        if route.driver_worker_id:
            w_result = await db.execute(
                select(Worker.first_name, Worker.last_name).where(
                    Worker.id == route.driver_worker_id
                )
            )
            row = w_result.one_or_none()
            if row:
                driver = f"{row.first_name} {row.last_name}"

        data = RouteWithWorkerCount.model_validate(route)
        data.assigned_workers = count
        data.vehicle_plate = plate
        data.driver_name = driver
        items.append(data)

    return PaginatedRoutes(items=items, total=total, page=page, page_size=page_size)


@routes_router.post("", response_model=RouteWithWorkerCount, status_code=201)
async def create_route(
    body: RouteCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RouteWithWorkerCount:
    route = TransportRoute(**body.model_dump())
    db.add(route)
    await db.commit()
    await db.refresh(route)

    data = RouteWithWorkerCount.model_validate(route)
    data.assigned_workers = 0
    data.vehicle_plate = None
    data.driver_name = None
    return data


@routes_router.put("/{route_id}", response_model=RouteWithWorkerCount)
async def update_route(
    route_id: UUID,
    body: RouteUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RouteWithWorkerCount:
    result = await db.execute(
        select(TransportRoute).where(TransportRoute.id == route_id)
    )
    route = result.scalar_one_or_none()
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(route, field, value)

    await db.commit()
    await db.refresh(route)

    count = await _active_worker_count(db, route.id)

    plate: str | None = None
    if route.vehicle_id:
        v_result = await db.execute(
            select(Vehicle.license_plate).where(Vehicle.id == route.vehicle_id)
        )
        plate = v_result.scalar_one_or_none()

    driver: str | None = None
    if route.driver_worker_id:
        w_result = await db.execute(
            select(Worker.first_name, Worker.last_name).where(
                Worker.id == route.driver_worker_id
            )
        )
        row = w_result.one_or_none()
        if row:
            driver = f"{row.first_name} {row.last_name}"

    data = RouteWithWorkerCount.model_validate(route)
    data.assigned_workers = count
    data.vehicle_plate = plate
    data.driver_name = driver
    return data


@routes_router.post("/{route_id}/assign", response_model=TransportAssignmentRead, status_code=201)
async def assign_worker_to_route(
    route_id: UUID,
    body: TransportAssignCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TransportAssignmentRead:
    route_result = await db.execute(
        select(TransportRoute).where(TransportRoute.id == route_id)
    )
    if route_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Route not found")

    worker_result = await db.execute(
        select(Worker).where(Worker.id == body.worker_id)
    )
    if worker_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Check for existing active assignment on this route
    existing = await db.execute(
        select(TransportAssignment).where(
            TransportAssignment.route_id == route_id,
            TransportAssignment.worker_id == body.worker_id,
            TransportAssignment.end_date.is_(None),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="Worker is already assigned to this route",
        )

    asgn = TransportAssignment(route_id=route_id, **body.model_dump())
    db.add(asgn)
    await db.commit()
    await db.refresh(asgn)
    return TransportAssignmentRead.model_validate(asgn)


@routes_router.get("/{route_id}/passengers", response_model=list[RoutePassenger])
async def list_route_passengers(
    route_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[RoutePassenger]:
    result = await db.execute(
        select(TransportAssignment, Worker.first_name, Worker.last_name)
        .join(Worker, TransportAssignment.worker_id == Worker.id)
        .where(
            TransportAssignment.route_id == route_id,
            TransportAssignment.end_date.is_(None),
        )
        .order_by(Worker.last_name, Worker.first_name)
    )
    return [
        RoutePassenger(
            worker_id=asgn.worker_id,
            worker_name=f"{first} {last}",
            start_date=asgn.start_date,
            end_date=asgn.end_date,
            assignment_id=asgn.id,
        )
        for asgn, first, last in result.all()
    ]


# ── Assignment management ─────────────────────────────────────────────────────

@assignments_router.patch("/{assignment_id}", response_model=TransportAssignmentRead)
async def update_transport_assignment(
    assignment_id: UUID,
    body: TransportAssignmentUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TransportAssignmentRead:
    result = await db.execute(
        select(TransportAssignment).where(TransportAssignment.id == assignment_id)
    )
    asgn = result.scalar_one_or_none()
    if asgn is None:
        raise HTTPException(status_code=404, detail="Assignment not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(asgn, field, value)

    await db.commit()
    await db.refresh(asgn)
    return TransportAssignmentRead.model_validate(asgn)
