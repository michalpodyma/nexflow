"""Shift templates and shift entries tables

Revision ID: 0019
Revises: 0018
Create Date: 2026-04-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shift_templates",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "client_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("position", sa.String(255), nullable=False),
        sa.Column("days_of_week", ARRAY(sa.Integer), nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("capacity", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "shift_entries",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "template_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("shift_templates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "worker_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "client_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("shift_date", sa.Date, nullable=False),
        sa.Column("start_dt", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("end_dt", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "ix_shift_entries_worker_date", "shift_entries", ["worker_id", "shift_date"]
    )
    op.create_index(
        "ix_shift_entries_client_date", "shift_entries", ["client_id", "shift_date"]
    )


def downgrade() -> None:
    op.drop_index("ix_shift_entries_client_date", table_name="shift_entries")
    op.drop_index("ix_shift_entries_worker_date", table_name="shift_entries")
    op.drop_table("shift_entries")
    op.drop_table("shift_templates")
