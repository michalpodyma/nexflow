"""Add referred_by column to candidates table

Revision ID: 0022
Revises: 0021
Create Date: 2026-04-29
"""

import sqlalchemy as sa
from alembic import op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("candidates", sa.Column("referred_by", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("candidates", "referred_by")
