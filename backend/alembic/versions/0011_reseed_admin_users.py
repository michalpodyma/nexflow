"""Reseed admin users with correct bcrypt hashes

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-03

Upserts nexflow0-nexflow3 with the production bcrypt hashes.  Migration
0002 used ON CONFLICT DO NOTHING so any pre-existing row with a stale hash
was silently kept.  This migration forces the correct hash via DO UPDATE.
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# bcrypt(cost=12) hashes — generated from production credentials
# Passwords are stored in the Vercel DASHBOARD_USERS env var.
_USERS = [
    ("nexflow0", "$2b$12$dRrcZpwHi0LONPnazrVyzO9.3T73KoncfqQ09vSt7XSZbJwoxskZ."),
    ("nexflow1", "$2b$12$GawNP0wK3v5raT0tZfsp1eAjmirXtqAju4gag3QrkdI5gC.neyGc."),
    ("nexflow2", "$2b$12$Zj1JkMw5aR23RUH/RW1j0OC9jWRT3eIotXm31FSBWhpsW4x7yh7Aa"),
    ("nexflow3", "$2b$12$ygZq385slXjzOdNfsvypjexNwfwiixYxz0S/.vGqnrs.laRMxTsai"),
]


def upgrade() -> None:
    conn = op.get_bind()
    for username, hashed_password in _USERS:
        conn.execute(
            sa.text(
                "INSERT INTO admin_users (username, hashed_password) "
                "VALUES (:username, :hashed_password) "
                "ON CONFLICT (username) DO UPDATE "
                "SET hashed_password = EXCLUDED.hashed_password"
            ).bindparams(username=username, hashed_password=hashed_password)
        )


def downgrade() -> None:
    pass  # Do not remove accounts on downgrade
