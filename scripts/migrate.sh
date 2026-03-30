#!/usr/bin/env bash
# Run Alembic migrations inside the running api container
set -euo pipefail

docker compose exec api alembic -c /app/../db/alembic.ini upgrade head
