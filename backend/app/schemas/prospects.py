from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

ProspectSource = Literal["referral", "cold_call", "website", "linkedin", "event", "other"]
ProspectStatus = Literal["new", "contacted", "qualified", "proposal_sent", "negotiating", "converted", "lost"]


class ProspectRead(BaseModel):
    id: UUID
    company_name: str
    contact_name: str | None
    contact_email: str | None
    contact_phone: str | None
    source: ProspectSource
    status: ProspectStatus
    estimated_monthly_value: Decimal | None
    notes: str | None
    next_follow_up: date | None
    converted_to_client_id: UUID | None
    assigned_to: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProspectCreate(BaseModel):
    company_name: str
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    source: ProspectSource = "other"
    status: ProspectStatus = "new"
    estimated_monthly_value: Decimal | None = None
    notes: str | None = None
    next_follow_up: date | None = None
    assigned_to: str | None = None


class ProspectUpdate(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    source: ProspectSource | None = None
    status: ProspectStatus | None = None
    estimated_monthly_value: Decimal | None = None
    notes: str | None = None
    next_follow_up: date | None = None
    assigned_to: str | None = None


class PaginatedProspects(BaseModel):
    items: list[ProspectRead]
    total: int
    page: int
    page_size: int


class ConvertProspectResponse(BaseModel):
    prospect: ProspectRead
    client_id: UUID
