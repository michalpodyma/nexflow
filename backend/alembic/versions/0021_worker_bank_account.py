"""Add bank_account column to workers table

Revision ID: 0021
Revises: 0020
Create Date: 2026-04-05
"""

import sqlalchemy as sa

from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("workers", sa.Column("bank_account", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("workers", "bank_account")
