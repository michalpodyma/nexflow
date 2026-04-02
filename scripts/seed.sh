#!/usr/bin/env bash
# Seed demo/test data into the recruiter dashboard database.
# Runs the seed script inside the already-running api container.
set -euo pipefail

docker compose exec api python /app/../scripts/seed_demo_data.py
