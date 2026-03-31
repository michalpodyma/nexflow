from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import Currency, JobPostingPlatform, JobPostingStatus


class JobPosting(Base):
    """
    An external job board listing published from the admin dashboard.

    A single recruiter action can create postings on multiple platforms; each
    platform gets its own row so that external_id, listing_url, and status are
    tracked independently per board.
    """

    __tablename__ = "job_postings"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    platform: Mapped[JobPostingPlatform] = mapped_column(
        sa.Enum(JobPostingPlatform, name="job_posting_platform", create_type=False),
        nullable=False,
    )
    # ID returned by the external board (OLX listing id, Pracuj.pl confirmation id)
    external_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    # Direct URL to the live listing, when available
    listing_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(sa.Integer, nullable=True)
    currency: Mapped[Currency | None] = mapped_column(
        sa.Enum(Currency, name="currency_enum", create_type=False),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    apply_url: Mapped[str] = mapped_column(
        sa.Text, nullable=False, server_default="https://nexflow.work/oferty"
    )

    posted_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    status: Mapped[JobPostingStatus] = mapped_column(
        sa.Enum(JobPostingStatus, name="job_posting_status", create_type=False),
        nullable=False,
        server_default="active",
    )

    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
