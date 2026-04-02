from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import Currency, JobOrderStatus, JobOrderUrgency


class JobOrderRead(BaseModel):
    id: UUID
    client_id: UUID
    title: str
    description: str | None
    location: str | None
    headcount_needed: int
    headcount_filled: int
    urgency: JobOrderUrgency
    status: JobOrderStatus
    deadline: date | None
    salary_min: Decimal | None
    salary_max: Decimal | None
    currency: Currency
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobOrderCreate(BaseModel):
    client_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    location: str | None = None
    headcount_needed: int = Field(1, ge=1)
    urgency: JobOrderUrgency = JobOrderUrgency.normal
    status: JobOrderStatus = JobOrderStatus.open
    deadline: date | None = None
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    currency: Currency = Currency.PLN


class JobOrderUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    location: str | None = None
    headcount_needed: int | None = Field(None, ge=1)
    headcount_filled: int | None = Field(None, ge=0)
    urgency: JobOrderUrgency | None = None
    status: JobOrderStatus | None = None
    deadline: date | None = None
    salary_min: Decimal | None = None
    salary_max: Decimal | None = None
    currency: Currency | None = None


class PaginatedJobOrders(BaseModel):
    items: list[JobOrderRead]
    total: int
    page: int
    page_size: int
