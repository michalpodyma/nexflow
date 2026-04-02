"""Seed nexflow0-nexflow3 recruiter accounts

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-02

Inserts the four recruiter/admin accounts required for dashboard access.
Passwords are bcrypt-hashed (cost 12) from the production credentials.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# bcrypt(cost=12) hashes — generated from production credentials
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
                "ON CONFLICT (username) DO NOTHING"
            ).bindparams(username=username, hashed_password=hashed_password)
        )


def downgrade() -> None:
    conn = op.get_bind()
    for username, _ in _USERS:
        conn.execute(
            sa.text("DELETE FROM admin_users WHERE username = :username").bindparams(
                username=username
            )
        )
