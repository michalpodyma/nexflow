"""worker_otps table for worker portal OTP authentication

Revision ID: 0020
Revises: 0019
Create Date: 2026-04-05
"""

import sqlalchemy as sa

from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "worker_otps",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("uuid_generate_v4()"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("code", sa.String(6), nullable=False),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("used_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_worker_otps_phone", "worker_otps", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_worker_otps_phone", table_name="worker_otps")
    op.drop_table("worker_otps")
