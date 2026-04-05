from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class HoursImportBatchRead(BaseModel):
    id: UUID
    client_id: UUID
    original_filename: str
    content_type: str
    file_size: int
    status: str
    raw_headers: list | None
    row_count: int | None
    matched_count: int | None
    unmatched_count: int | None
    flagged_count: int | None
    uploaded_by_user: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ColumnMappingItem(BaseModel):
    spreadsheet_header: str
    internal_field: str


class ColumnMappingRead(BaseModel):
    client_id: UUID
    mappings: list[ColumnMappingItem]


class ColumnMappingSave(BaseModel):
    mappings: list[ColumnMappingItem]


class UploadResponse(BaseModel):
    batch_id: UUID
    headers: list[str]
    suggested_mappings: dict[str, str]  # spreadsheet_header → internal_field
    row_count: int


class PreviewRow(BaseModel):
    row_index: int
    raw_data: dict
    matched_worker_id: str | None
    match_method: str | None
    match_status: str  # matched / unmatched / flagged
    validation_errors: list[str]
    work_date: date | None
    hours_worked: Decimal | None
    overtime_hours: Decimal | None


class PreviewResponse(BaseModel):
    batch_id: UUID
    rows: list[PreviewRow]
    matched_count: int
    unmatched_count: int
    flagged_count: int


class ApplyMappingsRequest(BaseModel):
    mappings: dict[str, str]  # spreadsheet_header → internal_field
    save_for_client: bool = False


class CommitResponse(BaseModel):
    batch_id: UUID
    imported_count: int
    skipped_count: int
    # Set when a draft invoice was auto-generated from the committed hours
    invoice_id: UUID | None = None


class WorkerHoursRead(BaseModel):
    id: UUID
    batch_id: UUID
    worker_id: UUID | None
    assignment_id: UUID | None
    row_index: int
    raw_worker_name: str | None
    work_date: date | None
    hours_worked: Decimal | None
    overtime_hours: Decimal | None
    absence_type: str | None
    notes: str | None
    match_status: str
    validation_errors: list | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedBatches(BaseModel):
    items: list[HoursImportBatchRead]
    total: int
    page: int
    page_size: int


class WorkerHoursSummary(BaseModel):
    """Summary for invoicing: hours per worker for a given assignment + month."""
    worker_id: UUID | None
    assignment_id: UUID | None
    total_hours: Decimal
    total_overtime: Decimal
    work_dates: list[date]
