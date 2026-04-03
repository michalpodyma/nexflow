from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth.router import router as auth_router
from app.config import settings
from app.database import engine
from app.models import Base
from app.routers.analytics import router as analytics_router
from app.routers.candidates import router as candidates_router
from app.routers.clients import router as clients_router
from app.routers.compliance import router as compliance_router
from app.routers.health import router as health_router
from app.routers.job_orders import router as job_orders_router
from app.routers.job_postings import router as job_postings_router
from app.routers.workers import router as workers_router

# DDL for PostgreSQL enum types — mirrors app/models/enums.py.
# Each statement is executed individually because asyncpg does not support
# multiple commands in a single prepared statement.
_ENUM_DDL_STATEMENTS = [
    """DO $$ BEGIN CREATE TYPE preferred_position AS ENUM (
        'warehouse_picker','forklift_operator','logistics_driver','other'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    """DO $$ BEGIN CREATE TYPE screening_status AS ENUM (
        'new','chatbot_in_progress','screened_pass','screened_fail',
        'offered','hired','rejected'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    "DO $$ BEGIN CREATE TYPE work_permit_type AS ENUM ('UE','non_UE_permit','none'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('pending','paid','overdue','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE currency_enum AS ENUM ('PLN','EUR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE chatbot_channel AS ENUM ('whatsapp','web'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    """DO $$ BEGIN CREATE TYPE alert_type AS ENUM (
        'contract_expiry','health_cert_expiry','bhp_cert_expiry',
        'a1_cert_expiry','deployment_limit_warning'
    ); EXCEPTION WHEN duplicate_object THEN NULL; END $$""",
    "DO $$ BEGIN CREATE TYPE audit_action AS ENUM ('insert','update','delete'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE gdpr_subject_type AS ENUM ('worker','candidate'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE attendance_status_enum AS ENUM ('active','off','terminated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE job_posting_platform AS ENUM ('olx','pracuj'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE job_posting_status AS ENUM ('active','expired','removed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE job_order_urgency AS ENUM ('normal','urgent','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE job_order_status AS ENUM ('open','sourcing','submitted','interview','filled','on_hold','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    import logging

    try:
        async with engine.begin() as conn:
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            for stmt in _ENUM_DDL_STATEMENTS:
                await conn.execute(text(stmt))
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        logging.getLogger(__name__).warning(
            "DB init failed at startup (will retry on first request): %s", exc
        )
    yield


app = FastAPI(title="Nexflow Platform API", version="0.1.0", lifespan=lifespan)

# CORS — allow frontend in dev and configured production URL
origins = ["http://localhost:3000"]
if settings.frontend_url and settings.frontend_url not in origins:
    origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(candidates_router)
app.include_router(workers_router)
app.include_router(clients_router)
app.include_router(compliance_router)
app.include_router(job_orders_router)
app.include_router(job_postings_router)
app.include_router(analytics_router)
