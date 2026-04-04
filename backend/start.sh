#!/bin/sh
set -e

# Pre-migration: apply columns that were missed when the DB was first bootstrapped
# via SQLAlchemy create_all (no alembic_version existed at that time).
# All statements use IF NOT EXISTS — fully idempotent and safe to re-run.
python3 - <<'PYEOF'
import asyncio, os, sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Idempotent DDL for columns added by migrations 0013-0015 that alter existing tables.
# New tables from 0016 were already created by create_all and do not need listing here.
MISSING_COLUMNS_SQL = [
    # Migration 0013: candidate → worker link
    "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES workers(id) ON DELETE SET NULL",
    "CREATE INDEX IF NOT EXISTS ix_candidates_worker_id ON candidates(worker_id)",
    # Migration 0014: praca.gov fields on workers
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS citizenship VARCHAR(100)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_type VARCHAR(100)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_series VARCHAR(20)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_number VARCHAR(50)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_issue_date TIMESTAMPTZ",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_expiry TIMESTAMPTZ",
    # Migration 0015: legalization columns on generated_documents
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_status TEXT",
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_filed_at TIMESTAMPTZ",
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_approved_at TIMESTAMPTZ",
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_expires_at TIMESTAMPTZ",
]

# Stamp alembic_version at 0016 only if no version exists yet.
# This tells alembic the DB is already at head so upgrade head becomes a no-op.
STAMP_SQL = [
    "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))",
    "INSERT INTO alembic_version (version_num) SELECT '0016' WHERE NOT EXISTS (SELECT 1 FROM alembic_version)",
]

async def run():
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        print("WARNING: DATABASE_URL not set, skipping pre-migration", file=sys.stderr)
        return
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            for sql in MISSING_COLUMNS_SQL:
                await conn.execute(text(sql))
            for sql in STAMP_SQL:
                await conn.execute(text(sql))
        print("Pre-migration complete.")
    except Exception as e:
        print(f"Pre-migration error (non-fatal): {e}", file=sys.stderr)
    finally:
        await engine.dispose()

asyncio.run(run())
PYEOF

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
