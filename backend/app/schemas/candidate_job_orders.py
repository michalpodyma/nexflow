from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import CandidateJobOrderStatus


class CandidateJobOrderRead(BaseModel):
    id: UUID
    candidate_id: UUID
    job_order_id: UUID
    status: CandidateJobOrderStatus
    submitted_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateJobOrderCreate(BaseModel):
    job_order_id: UUID
    status: CandidateJobOrderStatus = CandidateJobOrderStatus.submitted


class CandidateJobOrderUpdate(BaseModel):
    status: CandidateJobOrderStatus


class PaginatedCandidateJobOrders(BaseModel):
    items: list[CandidateJobOrderRead]
    total: int
    page: int
    page_size: int
