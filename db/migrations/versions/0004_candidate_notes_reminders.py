"""Add candidate notes, contacted_at, job_posting_id, and candidate_reminders table

Revision ID: d4e5f6a7b8c3
Revises: c3d4e5f6a7b2
Create Date: 2026-04-01 00:00:00.000000

Changes:
    candidates table — three new columns:
        notes           TEXT nullable   — recruiter freetext notes per candidate
        contacted_at    TIMESTAMPTZ     — set when recruiter marks candidate as contacted
        job_posting_id  UUID nullable   — FK to job_postings.id (soft ref, no cascade)

    candidate_reminders table — new:
        id              UUID PK
        candidate_id    UUID FK → candidates.id ON DELETE CASCADE
        reminder_date   TIMESTAMPTZ     — when the reminder is due
        reminder_text   TEXT            — what to do / note for the recruiter
        dismissed       BOOL            — true once recruiter has seen/dismissed it
        created_at      TIMESTAMPTZ
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "d4e5f6a7b8c3"
down_revision: Union[str, None] = "c3d4e5f6a7b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- candidates: add three columns ---
    op.add_column("candidates", sa.Column("notes", sa.Text, nullable=True))
    op.add_column(
        "candidates",
        sa.Column("contacted_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "candidates",
        sa.Column(
            "job_posting_id",
            UUID(as_uuid=True),
            sa.ForeignKey("job_postings.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_candidates_job_posting_id", "candidates", ["job_posting_id"])

    # --- candidate_reminders table ---
    op.create_table(
        "candidate_reminders",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "candidate_id",
            UUID(as_uuid=True),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("reminder_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("reminder_text", sa.Text, nullable=False),
        sa.Column(
            "dismissed",
            sa.Boolean,
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_candidate_reminders_candidate_id", "candidate_reminders", ["candidate_id"]
    )
    op.create_index(
        "ix_candidate_reminders_reminder_date", "candidate_reminders", ["reminder_date"]
    )


def downgrade() -> None:
    op.drop_table("candidate_reminders")
    op.drop_index("ix_candidates_job_posting_id", table_name="candidates")
    op.drop_column("candidates", "job_posting_id")
    op.drop_column("candidates", "contacted_at")
    op.drop_column("candidates", "notes")
