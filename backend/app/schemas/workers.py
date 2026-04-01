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
    a1_cert_status: str | None
    attendance_status: AttendanceStatus
    gdpr_consent: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkerDetail(WorkerRead):
    assignments: list[AssignmentSummary] = []


class WorkerUpdateStatus(BaseModel):
    attendance_status: AttendanceStatus


class PaginatedWorkers(BaseModel):
    items: list[WorkerRead]
    total: int
    page: int
    page_size: int
