from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import AttendanceStatus, WorkPermitType


class AssignmentSummary(BaseModel):
    id: UUID
    position: str
    client_id: UUID
    client_name: str
    employer_rate: Decimal
    start_date: datetime
    end_date: datetime | None
    is_active: bool

    model_config = {"from_attributes": True}


class WorkerRead(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    nationality: str | None
    phone: str | None
    email: str | None
    work_permit_type: WorkPermitType | None
    work_permit_expiry: datetime | None
    health_cert_expiry: datetime | None
    safety_cert_expiry: datetime | None
    a1_cert_status: str | None
    attendance_status: AttendanceStatus
    gdpr_consent: bool
    # Current assignment snapshot
    current_client_id: UUID | None
    current_client_name: str | None = None  # populated by router join, not ORM
    assignment_start_date: datetime | None
    assignment_end_date: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkerDetail(WorkerRead):
    assignments: list[AssignmentSummary] = []


class WorkerCreate(BaseModel):
    """All fields needed to create a new worker record."""
    first_name: str
    last_name: str
    nationality: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    date_of_birth: datetime | None = None
    work_permit_type: WorkPermitType | None = None
    work_permit_expiry: datetime | None = None
    health_cert_expiry: datetime | None = None
    safety_cert_expiry: datetime | None = None
    a1_cert_status: str | None = None
    a1_cert_expiry: datetime | None = None
    attendance_status: AttendanceStatus = AttendanceStatus.active
    gdpr_consent: bool = False
    gdpr_consent_at: datetime | None = None


class WorkerUpdate(BaseModel):
    """Editable fields for a worker record (all optional for partial updates)."""
    first_name: str | None = None
    last_name: str | None = None
    nationality: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    date_of_birth: datetime | None = None
    work_permit_type: WorkPermitType | None = None
    work_permit_expiry: datetime | None = None
    health_cert_expiry: datetime | None = None
    safety_cert_expiry: datetime | None = None
    a1_cert_status: str | None = None
    a1_cert_expiry: datetime | None = None
    attendance_status: AttendanceStatus | None = None
    current_client_id: UUID | None = None
    assignment_start_date: datetime | None = None
    assignment_end_date: datetime | None = None


class WorkerUpdateStatus(BaseModel):
    attendance_status: AttendanceStatus


class PaginatedWorkers(BaseModel):
    items: list[WorkerRead]
    total: int
    page: int
    page_size: int
