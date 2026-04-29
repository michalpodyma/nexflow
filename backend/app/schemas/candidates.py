import re
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from app.models.enums import LanguageCode, PreferredPosition, ScreeningStatus

# E.164 for Polish (+48, exactly 9 digits) or German (+49, 9–12 digits)
_E164_PL_DE = re.compile(r"^\+(48\d{9}|49\d{9,12})$")


class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    phone: str  # E.164, PL (+48) or DE (+49)
    email: EmailStr | None = None
    nationality: str  # ISO 3166-1 alpha-2
    availability_from: date
    preferred_position: PreferredPosition
    languages: list[LanguageCode]  # pl, de, en, uk, ru
    location_preference: str | None = None
    referred_by: str | None = None
    gdpr_consent: bool  # must be True
    gdpr_consent_at: datetime  # client-side timestamp

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not _E164_PL_DE.match(v):
            raise ValueError(
                "Phone must be E.164 format for Polish (+48) or German (+49) numbers"
            )
        return v

    @field_validator("nationality")
    @classmethod
    def validate_nationality(cls, v: str) -> str:
        if len(v) != 2 or not v.isalpha():
            raise ValueError("Nationality must be a 2-letter ISO 3166-1 alpha-2 code")
        return v.upper()

    @field_validator("gdpr_consent")
    @classmethod
    def gdpr_must_be_true(cls, v: bool) -> bool:
        if not v:
            raise ValueError("GDPR consent is required")
        return v


class CandidateUpdate(BaseModel):
    """PATCH body for a single candidate record — all fields optional."""
    notes: str | None = None
    screening_status: ScreeningStatus | None = None
    job_posting_id: UUID | None = None
    contacted_at: datetime | None = None


class BulkUpdateRequest(BaseModel):
    """
    Apply an action to a batch of candidates.

    Actions:
        set_status      — sets screening_status to `status_value`
        assign_posting  — sets job_posting_id to `job_posting_id`
        mark_contacted  — sets contacted_at to now()
    """
    candidate_ids: list[UUID]
    action: str  # "set_status" | "assign_posting" | "mark_contacted"
    status_value: ScreeningStatus | None = None
    job_posting_id: UUID | None = None


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
    notes: str | None
    contacted_at: datetime | None
    job_posting_id: UUID | None
    worker_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedCandidates(BaseModel):
    items: list[CandidateRead]
    total: int
    page: int
    page_size: int


# --- Reminder schemas ---

class ReminderCreate(BaseModel):
    reminder_date: datetime
    reminder_text: str


class ReminderRead(BaseModel):
    id: UUID
    candidate_id: UUID
    reminder_date: datetime
    reminder_text: str
    dismissed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DueRemindersCount(BaseModel):
    due_count: int
