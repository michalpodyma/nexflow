"""Add admin_users table and seed default admin

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-03-30 00:00:00.000000

Seeds a default admin user:
    username: admin
    password: admin (bcrypt hashed — CHANGE IN PRODUCTION via env/migration)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "b2c3d4e5f6a1"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# bcrypt hash of "admin" — generated with passlib.context.CryptContext(schemes=["bcrypt"])
# Replace this hash in a production migration with a secure password
_ADMIN_PASSWORD_HASH = (
    "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"
)


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("hashed_password", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Seed default admin for local dev — change password after first login
    op.execute(
        sa.text(
            "INSERT INTO admin_users (username, hashed_password) "
            f"VALUES ('admin', '{_ADMIN_PASSWORD_HASH}')"
        )
    )


def downgrade() -> None:
    op.drop_table("admin_users")
