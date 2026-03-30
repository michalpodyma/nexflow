from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import Currency


class ClientRead(BaseModel):
    id: UUID
    company_name: str
    nip: str | None
    vat_eu: str | None
    address: str | None
    city: str | None
    postal_code: str | None
    country: str | None
    phone: str | None
    email: str | None
    account_manager_name: str | None
    payment_terms_days: int
    currency: Currency
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedClients(BaseModel):
    items: list[ClientRead]
    total: int
    page: int
    page_size: int
