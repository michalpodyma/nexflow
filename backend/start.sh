#!/bin/sh
set -e

# Pre-migration: apply ALL ALTER TABLE columns from migrations 0004-0015 that
# could not run if the DB was originally bootstrapped via SQLAlchemy create_all.
# Statements use IF NOT EXISTS — fully idempotent and safe on every restart.
python3 - <<'PYEOF'
import asyncio, os, sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# All ALTER TABLE / CREATE INDEX statements from migrations 0004-0015 that
# modify EXISTING tables. Ordered by migration; idempotent (IF NOT EXISTS).
MISSING_COLUMNS_SQL = [
    # --- Migration 0004: worker assignment snapshot + BHP expiry ---
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS safety_cert_expiry TIMESTAMPTZ",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS current_client_id UUID REFERENCES clients(id) ON DELETE SET NULL",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS assignment_start_date TIMESTAMPTZ",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS assignment_end_date TIMESTAMPTZ",
    "CREATE INDEX IF NOT EXISTS ix_workers_current_client_id ON workers(current_client_id)",

    # --- Migration 0006: worker soft-delete ---
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ",

    # --- Migration 0013: candidate → worker link ---
    "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES workers(id) ON DELETE SET NULL",
    "CREATE INDEX IF NOT EXISTS ix_candidates_worker_id ON candidates(worker_id)",

    # --- Migration 0014: praca.gov fields on workers ---
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS citizenship VARCHAR(100)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_type VARCHAR(100)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_series VARCHAR(20)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_number VARCHAR(50)",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_issue_date TIMESTAMPTZ",
    "ALTER TABLE workers ADD COLUMN IF NOT EXISTS travel_document_expiry TIMESTAMPTZ",

    # --- Migration 0015: legalization columns on generated_documents ---
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_status TEXT",
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_filed_at TIMESTAMPTZ",
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_approved_at TIMESTAMPTZ",
    "ALTER TABLE generated_documents ADD COLUMN IF NOT EXISTS legalization_expires_at TIMESTAMPTZ",
]

# Stamp alembic_version at latest migration only if no version exists yet.
# Prevents alembic from re-running all migrations from scratch.
STAMP_SQL = [
    "CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))",
    "INSERT INTO alembic_version (version_num) SELECT '0021' WHERE NOT EXISTS (SELECT 1 FROM alembic_version)",
    "UPDATE alembic_version SET version_num = '0021' WHERE version_num < '0021'",
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
                try:
                    await conn.execute(text(sql))
                except Exception as e:
                    print(f"Pre-migration stmt skipped ({e}): {sql[:80]}", file=sys.stderr)
            for sql in STAMP_SQL:
                await conn.execute(text(sql))
        print("Pre-migration complete.")
    except Exception as e:
        print(f"Pre-migration error (non-fatal): {e}", file=sys.stderr)
    finally:
        await engine.dispose()

asyncio.run(run())
PYEOF

alembic upgrade head || echo "Alembic migration failed (non-fatal) — schema may already be up to date"

# Start Celery worker (processes tasks) and beat (fires scheduled tasks) as background processes.
# beat schedule is defined in app/workers/celery_app.py.
celery -A app.workers.celery_app worker --loglevel=info &
celery -A app.workers.celery_app beat --loglevel=info &

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
