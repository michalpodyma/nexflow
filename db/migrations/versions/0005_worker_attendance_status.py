"""Add attendance_status to workers

Revision ID: e5f6a7b8c9d4
Revises: d4e5f6a7b8c3
Create Date: 2026-04-01 00:00:00.000000

Changes:
    workers table:
        attendance_status  attendance_status_enum  nullable=False  default='active'

    New PostgreSQL enum type: attendance_status_enum
        Values: active, off, terminated
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d4"
down_revision: Union[str, None] = "d4e5f6a7b8c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE attendance_status_enum AS ENUM ('active', 'off', 'terminated')"
    )
    op.add_column(
        "workers",
        sa.Column(
            "attendance_status",
            sa.Enum("active", "off", "terminated", name="attendance_status_enum", create_type=False),
            nullable=False,
            server_default="active",
        ),
    )
    op.create_index("ix_workers_attendance_status", "workers", ["attendance_status"])


def downgrade() -> None:
    op.drop_index("ix_workers_attendance_status", table_name="workers")
    op.drop_column("workers", "attendance_status")
    op.execute("DROP TYPE attendance_status_enum")
