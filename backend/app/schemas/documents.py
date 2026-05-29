from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import DocumentStatus, TemplateType

# ── Document Templates ─────────────────────────────────────────────────────────

class DocumentTemplateRead(BaseModel):
    id: UUID
    name: str
    template_type: TemplateType
    is_active: bool
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentTemplateDetail(DocumentTemplateRead):
    body_html: str


class DocumentTemplateCreate(BaseModel):
    name: str
    template_type: TemplateType
    body_html: str
    is_active: bool = True


class DocumentTemplateUpdate(BaseModel):
    name: str | None = None
    template_type: TemplateType | None = None
    body_html: str | None = None
    is_active: bool | None = None


class PaginatedTemplates(BaseModel):
    items: list[DocumentTemplateRead]
    total: int
    page: int
    page_size: int


# ── Generated Documents ────────────────────────────────────────────────────────

class GeneratedDocumentRead(BaseModel):
    id: UUID
    template_id: UUID
    worker_id: UUID
    assignment_id: UUID | None
    status: DocumentStatus
    generated_by_user: str | None
    template_name_snapshot: str
    created_at: datetime
    updated_at: datetime
    # Legalization tracking (None for non-legalization documents)
    legalization_status: str | None = None
    legalization_filed_at: datetime | None = None
    legalization_approved_at: datetime | None = None
    legalization_expires_at: datetime | None = None

    model_config = {"from_attributes": True}


class GeneratedDocumentDetail(GeneratedDocumentRead):
    rendered_html: str


class GenerateDocumentRequest(BaseModel):
    template_id: UUID
    worker_id: UUID
    assignment_id: UUID | None = None
    overrides: dict[str, str] | None = None


class LegalizationStatusUpdate(BaseModel):
    """Payload for PATCH /api/v1/documents/{id}/legalization-status."""
    legalization_status: str  # filed / pending / approved / rejected / expired
    legalization_filed_at: datetime | None = None
    legalization_approved_at: datetime | None = None
    legalization_expires_at: datetime | None = None


class PaginatedDocuments(BaseModel):
    items: list[GeneratedDocumentRead]
    total: int
    page: int
    page_size: int
