"""Add praca.gov fields to workers table — gender, citizenship, travel document

Revision ID: 0014
Revises: 0013
Create Date: 2026-04-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # praca.gov fields
    op.add_column("workers", sa.Column("gender", sa.String(20), nullable=True))
    op.add_column("workers", sa.Column("citizenship", sa.String(100), nullable=True))
    op.add_column("workers", sa.Column("travel_document_type", sa.String(100), nullable=True))
    op.add_column("workers", sa.Column("travel_document_series", sa.String(20), nullable=True))
    op.add_column("workers", sa.Column("travel_document_number", sa.String(50), nullable=True))
    op.add_column(
        "workers",
        sa.Column("travel_document_issue_date", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "workers",
        sa.Column("travel_document_expiry", sa.TIMESTAMP(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("workers", "travel_document_expiry")
    op.drop_column("workers", "travel_document_issue_date")
    op.drop_column("workers", "travel_document_number")
    op.drop_column("workers", "travel_document_series")
    op.drop_column("workers", "travel_document_type")
    op.drop_column("workers", "citizenship")
    op.drop_column("workers", "gender")
