from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from app.models.enums import Currency
from app.models.client_activities import ActivityType


# ── Client schemas ─────────────────────────────────────────────────────────────

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


class ClientCreate(BaseModel):
    company_name: str
    nip: str | None = None
    vat_eu: str | None = None
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    account_manager_name: str | None = None
    payment_terms_days: int = 30
    currency: Currency = Currency.PLN
    is_active: bool = True

    @field_validator("nip")
    @classmethod
    def validate_nip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = v.replace("-", "").replace(" ", "")
        if not digits.isdigit() or len(digits) != 10:
            raise ValueError("NIP must be 10 digits")
        return digits


class ClientUpdate(BaseModel):
    company_name: str | None = None
    nip: str | None = None
    vat_eu: str | None = None
    address: str | None = None
    city: str | None = None
    postal_code: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    account_manager_name: str | None = None
    payment_terms_days: int | None = None
    currency: Currency | None = None
    is_active: bool | None = None

    @field_validator("nip")
    @classmethod
    def validate_nip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = v.replace("-", "").replace(" ", "")
        if not digits.isdigit() or len(digits) != 10:
            raise ValueError("NIP must be 10 digits")
        return digits


class PaginatedClients(BaseModel):
    items: list[ClientRead]
    total: int
    page: int
    page_size: int


# ── ClientActivity schemas ─────────────────────────────────────────────────────

class ClientActivityRead(BaseModel):
    id: UUID
    client_id: UUID
    activity_type: ActivityType
    description: str
    created_by: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClientActivityCreate(BaseModel):
    activity_type: ActivityType
    description: str
    created_by: str | None = None


class PaginatedClientActivities(BaseModel):
    items: list[ClientActivityRead]
    total: int
    page: int
    page_size: int


# ── ClientContact schemas ──────────────────────────────────────────────────────

class ClientContactRead(BaseModel):
    id: UUID
    client_id: UUID
    name: str
    role: str | None
    phone: str | None
    email: str | None
    is_primary: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientContactCreate(BaseModel):
    name: str
    role: str | None = None
    phone: str | None = None
    email: str | None = None
    is_primary: bool = False


class ClientContactUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    phone: str | None = None
    email: str | None = None
    is_primary: bool | None = None
