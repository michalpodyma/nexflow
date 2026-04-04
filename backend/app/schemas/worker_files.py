from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

ALLOWED_DOCUMENT_TYPES = frozenset(
    {"work_permit", "passport", "medical_exam", "bhp_cert", "a1_cert", "id_card", "other"}
)


class WorkerFileRead(BaseModel):
    id: UUID
    worker_id: UUID
    file_name: str
    content_type: str
    file_size: int
    document_type: str | None
    uploaded_by_user: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedWorkerFiles(BaseModel):
    items: list[WorkerFileRead]
    total: int
    page: int
    page_size: int


class WorkerFileDownloadResponse(BaseModel):
    url: str
    expires_in: int
