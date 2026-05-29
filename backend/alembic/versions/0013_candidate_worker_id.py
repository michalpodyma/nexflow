"""Add worker_id FK to candidates table (candidate-to-worker transition)

Revision ID: 0013
Revises: 0012
Create Date: 2026-04-04
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "candidates",
        sa.Column(
            "worker_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_candidates_worker_id", "candidates", ["worker_id"])


def downgrade() -> None:
    op.drop_index("ix_candidates_worker_id", table_name="candidates")
    op.drop_column("candidates", "worker_id")
