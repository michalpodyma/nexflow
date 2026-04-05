from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.enums import Currency, PaymentStatus


class InvoiceLineItemRead(BaseModel):
    id: UUID
    invoice_id: UUID
    worker_id: UUID | None
    assignment_id: UUID | None
    description: str
    hours_worked: Decimal | None
    unit_rate: Decimal | None
    net_amount: Decimal
    period_start: date | None
    period_end: date | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    client_id: UUID
    invoice_number: str
    sale_date: datetime
    due_date: datetime
    net_amount: Decimal
    vat_amount: Decimal = Decimal("0.00")
    gross_amount: Decimal
    vat_rate: Decimal = Decimal("0.00")
    currency: Currency = Currency.PLN
    period_start: datetime | None = None
    period_end: datetime | None = None

    @field_validator("invoice_number")
    @classmethod
    def validate_invoice_number(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("invoice_number must not be empty")
        return v


class InvoiceUpdate(BaseModel):
    payment_status: PaymentStatus | None = None
    due_date: datetime | None = None


class InvoiceRead(BaseModel):
    id: UUID
    client_id: UUID
    invoice_number: str
    sale_date: datetime
    due_date: datetime
    net_amount: Decimal
    vat_amount: Decimal
    gross_amount: Decimal
    vat_rate: Decimal
    currency: Currency
    payment_status: PaymentStatus
    period_start: datetime | None
    period_end: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvoiceWithLineItemsRead(InvoiceRead):
    line_items: list[InvoiceLineItemRead] = []


class PaginatedInvoices(BaseModel):
    items: list[InvoiceRead]
    total: int
    page: int
    page_size: int
