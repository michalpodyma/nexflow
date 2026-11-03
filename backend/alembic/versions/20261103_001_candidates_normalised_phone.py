"""add normalised_phone unique column to candidates (EUR-3958)

Revision ID: 20261103_001
Revises: 20261030_001
Create Date: 2026-11-03
"""

import sqlalchemy as sa

from alembic import op

revision = "20261103_001"
down_revision = "20261030_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "candidates",
        sa.Column("normalised_phone", sa.String(20), nullable=True),
    )
    # Backfill: strip all non-digits from existing phone values
    op.execute(
        "UPDATE candidates SET normalised_phone = regexp_replace(phone, '[^0-9]', '', 'g') "
        "WHERE phone IS NOT NULL"
    )
    op.create_index(
        "ix_candidates_normalised_phone",
        "candidates",
        ["normalised_phone"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_candidates_normalised_phone", table_name="candidates")
    op.drop_column("candidates", "normalised_phone")
