# Nexflow Platform

Automated recruitment and client acquisition platform for Eurojob-West.

## Stack

| Layer    | Technology                     |
| -------- | ------------------------------ |
| Backend  | Python 3.12, FastAPI, SQLAlchemy 2.x async |
| Frontend | Next.js 14, TypeScript         |
| Database | PostgreSQL 16                  |
| Queue    | Redis 7 + Celery 5             |
| Tooling  | uv (Python), pnpm (Node)       |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose v2)
- Git

## Local setup

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd nexflow-platform
   ```

2. **Create your `.env` file**

   ```bash
   cp .env.example .env
   # Edit .env if you need non-default values
   ```

3. **Start all services**

   ```bash
   docker compose up --build
   ```

   First build takes a few minutes. Subsequent starts are fast.

4. **Verify services are running**

   | Service  | URL                          |
   | -------- | ---------------------------- |
   | API      | http://localhost:8000/health |
   | Frontend | http://localhost:3000        |
   | Postgres | localhost:5432               |
   | Redis    | localhost:6379               |

5. **Run database migrations**

   ```bash
   bash scripts/migrate.sh
   ```

## Development workflow

- Backend hot-reloads on file save (uvicorn `--reload`).
- Frontend hot-reloads on file save (Next.js dev server).
- Worker picks up new task definitions automatically when restarted.

## Running tests locally

**Python (backend)**

```bash
cd backend
pip install uv
uv pip install --system -e ".[dev]"
pytest
```

**Next.js (frontend)**

```bash
cd frontend
pnpm install
pnpm test
```

## Project structure

```
nexflow-platform/
├── backend/          # Python 3.12 + FastAPI
├── frontend/         # Next.js 14
├── workers/          # Celery background workers
├── db/
│   └── migrations/   # Alembic migration files
├── infra/            # Docker, ECS task definitions (stubs)
├── scripts/          # Dev utilities
├── docker-compose.yml
├── .env.example
└── .github/
    └── workflows/
        └── ci.yml
```
