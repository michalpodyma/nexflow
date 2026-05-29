"""add facebook_post_queue table

Revision ID: 20260430_001
Revises:
Create Date: 2026-04-30
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision = "20260430_001"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "facebook_post_queue",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("post_id", sa.String(), nullable=True),
        sa.Column("post_url", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_facebook_post_queue_scheduled_at_pending",
        "facebook_post_queue",
        ["scheduled_at"],
        postgresql_where=sa.text("posted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_facebook_post_queue_scheduled_at_pending",
        table_name="facebook_post_queue",
    )
    op.drop_table("facebook_post_queue")
