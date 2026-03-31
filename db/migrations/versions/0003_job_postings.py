"""Add job_postings table

Revision ID: c3d4e5f6a7b2
Revises: b2c3d4e5f6a1
Create Date: 2026-03-31 00:00:00.000000

New enum types:
    job_posting_platform  — olx, pracuj
    job_posting_status    — active, expired, removed

New table:
    job_postings  — external job board listings published from the admin dashboard
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "c3d4e5f6a7b2"
down_revision: Union[str, None] = "b2c3d4e5f6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE job_posting_platform AS ENUM ('olx', 'pracuj')")
    op.execute("CREATE TYPE job_posting_status AS ENUM ('active', 'expired', 'removed')")

    op.create_table(
        "job_postings",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "platform",
            sa.Enum("olx", "pracuj", name="job_posting_platform", create_type=False),
            nullable=False,
        ),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("listing_url", sa.Text, nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("salary_min", sa.Integer, nullable=True),
        sa.Column("salary_max", sa.Integer, nullable=True),
        sa.Column(
            "currency",
            sa.Enum("PLN", "EUR", name="currency_enum", create_type=False),
            nullable=True,
        ),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "apply_url",
            sa.Text,
            nullable=False,
            server_default="https://nexflow.work/oferty",
        ),
        sa.Column("posted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "expired", "removed", name="job_posting_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index("ix_job_postings_platform", "job_postings", ["platform"])
    op.create_index("ix_job_postings_status", "job_postings", ["status"])
    op.create_index("ix_job_postings_created_at", "job_postings", ["created_at"])


def downgrade() -> None:
    op.drop_table("job_postings")
    op.execute("DROP TYPE IF EXISTS job_posting_status")
    op.execute("DROP TYPE IF EXISTS job_posting_platform")
