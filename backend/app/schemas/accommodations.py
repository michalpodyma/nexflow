from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class AccommodationRead(BaseModel):
    id: UUID
    name: str
    address: str | None
    city: str | None
    total_capacity: int
    rooms_count: int | None
    monthly_rent: Decimal | None
    monthly_utilities: Decimal | None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccommodationWithOccupancy(AccommodationRead):
    """AccommodationRead extended with live occupancy count."""
    current_occupancy: int


class AccommodationCreate(BaseModel):
    name: str
    address: str | None = None
    city: str | None = None
    total_capacity: int
    rooms_count: int | None = None
    monthly_rent: Decimal | None = None
    monthly_utilities: Decimal | None = None
    is_active: bool = True
    notes: str | None = None


class AccommodationUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    total_capacity: int | None = None
    rooms_count: int | None = None
    monthly_rent: Decimal | None = None
    monthly_utilities: Decimal | None = None
    is_active: bool | None = None
    notes: str | None = None


class PaginatedAccommodations(BaseModel):
    items: list[AccommodationWithOccupancy]
    total: int
    page: int
    page_size: int


# ── Assignment schemas ────────────────────────────────────────────────────────

class ResidentSummary(BaseModel):
    """Worker stub returned inside AccommodationDetail."""
    worker_id: UUID
    worker_name: str
    room_number: str | None
    move_in_date: datetime
    move_out_date: datetime | None
    monthly_cost_to_worker: Decimal | None
    assignment_id: UUID


class AccommodationDetail(AccommodationWithOccupancy):
    """Full detail including current residents."""
    residents: list[ResidentSummary]


class AssignmentCreate(BaseModel):
    worker_id: UUID
    room_number: str | None = None
    move_in_date: datetime
    monthly_cost_to_worker: Decimal | None = None


class AssignmentRead(BaseModel):
    id: UUID
    worker_id: UUID
    accommodation_id: UUID
    room_number: str | None
    move_in_date: datetime
    move_out_date: datetime | None
    monthly_cost_to_worker: Decimal | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AssignmentUpdate(BaseModel):
    room_number: str | None = None
    move_out_date: datetime | None = None
    monthly_cost_to_worker: Decimal | None = None
