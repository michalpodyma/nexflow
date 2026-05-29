"""Add archived_at to workers for soft-delete

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-03

Adds:
  - archived_at — nullable timestamp; non-null means the worker is archived (soft-deleted).
    Archived workers are hidden from default list queries.
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workers",
        sa.Column("archived_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("workers", "archived_at")
