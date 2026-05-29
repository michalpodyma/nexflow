"""Add client_activities and client_contacts tables

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-03

Adds:
  - client_activities — chronological activity log per client (note/call/email/meeting)
  - client_contacts   — named contacts at a client company
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # No explicit DO block — let SQLAlchemy's visit_enum create the type via its
    # memo system as part of op.create_table. Using DO block + create_type=False
    # breaks because visit_enum ignores create_type when checkfirst=False.

    # ── client_activities ────────────────────────────────────────────────────────
    op.create_table(
        "client_activities",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "client_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "activity_type",
            sa.Enum(
                "note", "call", "email", "meeting",
                name="client_activity_type_enum",
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_client_activities_client_id", "client_activities", ["client_id"])

    # ── client_contacts ──────────────────────────────────────────────────────────
    op.create_table(
        "client_contacts",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "client_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("is_primary", sa.Boolean, nullable=False, server_default=sa.false()),
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
    op.create_index("ix_client_contacts_client_id", "client_contacts", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_client_contacts_client_id", "client_contacts")
    op.drop_table("client_contacts")
    op.drop_index("ix_client_activities_client_id", "client_activities")
    op.drop_table("client_activities")
    op.execute("DROP TYPE IF EXISTS client_activity_type_enum")
