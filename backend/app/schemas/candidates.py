from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.models.enums import PreferredPosition, ScreeningStatus


class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    phone: str | None = None
    email: str | None = None
    nationality: str | None = None
    availability_from: datetime | None = None
    preferred_position: PreferredPosition | None = None
    languages: list[str] | None = None
    location_preference: str | None = None
    gdpr_consent: bool


class CandidateRead(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    phone: str | None
    email: str | None
    nationality: str | None
    availability_from: datetime | None
    preferred_position: PreferredPosition | None
    languages: list[str] | None
    location_preference: str | None
    screening_status: ScreeningStatus
    screening_score: int | None
    gdpr_consent: bool
    gdpr_consent_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCandidates(BaseModel):
    items: list[CandidateRead]
    total: int
    page: int
    page_size: int
