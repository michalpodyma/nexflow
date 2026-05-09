"""add llm_log column to chatbot_sessions (EUR-628)

Revision ID: 20260509_001
Revises: 20260430_001
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260509_001"
down_revision = "20260430_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chatbot_sessions",
        sa.Column("llm_log", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chatbot_sessions", "llm_log")
