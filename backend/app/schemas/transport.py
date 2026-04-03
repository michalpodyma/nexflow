from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel


# ── Vehicle schemas ───────────────────────────────────────────────────────────

class VehicleRead(BaseModel):
    id: UUID
    make: str
    model: str
    year: int | None
    license_plate: str
    capacity: int
    insurance_expiry_date: date | None
    inspection_expiry_date: date | None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int | None = None
    license_plate: str
    capacity: int
    insurance_expiry_date: date | None = None
    inspection_expiry_date: date | None = None
    is_active: bool = True
    notes: str | None = None


class VehicleUpdate(BaseModel):
    make: str | None = None
    model: str | None = None
    year: int | None = None
    license_plate: str | None = None
    capacity: int | None = None
    insurance_expiry_date: date | None = None
    inspection_expiry_date: date | None = None
    is_active: bool | None = None
    notes: str | None = None


class PaginatedVehicles(BaseModel):
    items: list[VehicleRead]
    total: int
    page: int
    page_size: int


# ── Route schemas ─────────────────────────────────────────────────────────────

class RouteRead(BaseModel):
    id: UUID
    name: str
    origin: str
    destination: str
    vehicle_id: UUID | None
    driver_worker_id: UUID | None
    departure_time: time | None
    return_time: time | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RouteWithWorkerCount(RouteRead):
    assigned_workers: int = 0
    vehicle_plate: str | None = None
    driver_name: str | None = None


class RouteCreate(BaseModel):
    name: str
    origin: str
    destination: str
    vehicle_id: UUID | None = None
    driver_worker_id: UUID | None = None
    departure_time: time | None = None
    return_time: time | None = None
    is_active: bool = True


class RouteUpdate(BaseModel):
    name: str | None = None
    origin: str | None = None
    destination: str | None = None
    vehicle_id: UUID | None = None
    driver_worker_id: UUID | None = None
    departure_time: time | None = None
    return_time: time | None = None
    is_active: bool | None = None


class PaginatedRoutes(BaseModel):
    items: list[RouteWithWorkerCount]
    total: int
    page: int
    page_size: int


# ── Assignment schemas ────────────────────────────────────────────────────────

class TransportAssignmentRead(BaseModel):
    id: UUID
    worker_id: UUID
    route_id: UUID
    start_date: date
    end_date: date | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransportAssignCreate(BaseModel):
    worker_id: UUID
    start_date: date
    end_date: date | None = None


class TransportAssignmentUpdate(BaseModel):
    end_date: date | None = None


class RoutePassenger(BaseModel):
    worker_id: UUID
    worker_name: str
    start_date: date
    end_date: date | None
    assignment_id: UUID
