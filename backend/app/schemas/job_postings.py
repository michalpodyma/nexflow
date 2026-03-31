from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, HttpUrl, field_validator

from app.models.enums import Currency, JobPostingPlatform, JobPostingStatus


class JobPostingCreate(BaseModel):
    platforms: list[JobPostingPlatform]  # one or both platforms
    title: str
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    currency: Currency = Currency.PLN
    description: str
    apply_url: str = "https://nexflow.work/oferty"

    @field_validator("platforms")
    @classmethod
    def at_least_one_platform(cls, v: list[JobPostingPlatform]) -> list[JobPostingPlatform]:
        if not v:
            raise ValueError("At least one platform must be selected")
        return v

    @field_validator("salary_min", "salary_max")
    @classmethod
    def non_negative(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("Salary values must be non-negative")
        return v


class JobPostingRead(BaseModel):
    id: UUID
    platform: JobPostingPlatform
    external_id: str | None
    listing_url: str | None
    title: str
    location: str | None
    salary_min: int | None
    salary_max: int | None
    currency: Currency | None
    description: str | None
    apply_url: str
    posted_at: datetime | None
    expires_at: datetime | None
    status: JobPostingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class JobPostingCreateResult(BaseModel):
    """Returned after a multi-platform post attempt."""
    postings: list[JobPostingRead]
    errors: dict[str, str]  # platform -> error message for any failures


class PaginatedJobPostings(BaseModel):
    items: list[JobPostingRead]
    total: int
    page: int
    page_size: int
