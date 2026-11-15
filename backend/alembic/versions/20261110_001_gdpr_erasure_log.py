"""create gdpr_erasure_log table (EUR-4013)

Revision ID: 20261110_001
Revises: 20261103_001
Create Date: 2026-11-10
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision = "20261110_001"
down_revision = "20261103_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "gdpr_erasure_log",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            server_default=sa.text("uuid_generate_v4()"),
            nullable=False,
        ),
        sa.Column("actor", sa.String(100), nullable=False),
        sa.Column("scope", sa.String(100), nullable=False),
        sa.Column("candidate_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("records_deleted", sa.Integer, server_default="0", nullable=False),
        sa.Column("paperclip_issue_ref", sa.String(64), nullable=True),
        sa.Column(
            "erased_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_gdpr_erasure_log_candidate_id",
        "gdpr_erasure_log",
        ["candidate_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_gdpr_erasure_log_candidate_id", table_name="gdpr_erasure_log")
    op.drop_table("gdpr_erasure_log")
