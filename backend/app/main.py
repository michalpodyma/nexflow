from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth.router import router as auth_router
from app.config import settings
from app.database import engine
from app.models import Base
from app.routers.accommodations import assignments_router as accommodation_assignments_router
from app.routers.accommodations import router as accommodations_router
from app.routers.accommodations import worker_accommodations_router
from app.routers.analytics import router as analytics_router
from app.routers.transport import assignments_router as transport_assignments_router
from app.routers.transport import routes_router as transport_routes_router
from app.routers.transport import vehicles_router
from app.routers.candidate_job_orders import router as candidate_job_orders_router
from app.routers.candidates import router as candidates_router
from app.routers.clients import router as clients_router
from app.routers.compliance import router as compliance_router
from app.routers.health import router as health_router
from app.routers.job_orders import router as job_orders_router
from app.routers.job_postings import router as job_postings_router
from app.routers.workers import router as workers_router
from app.routers.documents import templates_router, documents_router, worker_docs_router
from app.routers.placements import router as placements_router
from app.routers.prospects import router as prospects_router
from app.routers.worker_files import router as worker_files_router
from app.routers.hours_import import (
    clients_router as hours_import_clients_router,
    batches_router as hours_import_batches_router,
    assignments_hours_router,
)
from app.routers.aga_export import router as aga_export_router
from app.routers.invoices import router as invoices_router
from app.routers.shifts import router as shifts_router
from app.routers.worker_portal import router as worker_portal_router
from app.routers.webhooks import router as webhooks_router
from app.routers.chatbot import router as chatbot_router
from app.routers.facebook_posts import router as facebook_posts_router
from app.routers.openclaw import router as openclaw_router
from app.seed_data import SEED_TEMPLATES

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
    "DO $$ BEGIN CREATE TYPE candidate_job_order_status AS ENUM ('submitted','interviewing','offered','placed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE template_type_enum AS ENUM ('employment_contract','mandate_contract','annex','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    # Add legalization template types if not already present (idempotent — safe on re-run)
    "DO $$ BEGIN ALTER TYPE template_type_enum ADD VALUE IF NOT EXISTS 'oswiadczenie'; EXCEPTION WHEN others THEN NULL; END $$",
    "DO $$ BEGIN ALTER TYPE template_type_enum ADD VALUE IF NOT EXISTS 'permit_a'; EXCEPTION WHEN others THEN NULL; END $$",
    "DO $$ BEGIN ALTER TYPE template_type_enum ADD VALUE IF NOT EXISTS 'permit_b'; EXCEPTION WHEN others THEN NULL; END $$",
    "DO $$ BEGIN ALTER TYPE template_type_enum ADD VALUE IF NOT EXISTS 'permit_seasonal'; EXCEPTION WHEN others THEN NULL; END $$",
    "DO $$ BEGIN ALTER TYPE template_type_enum ADD VALUE IF NOT EXISTS 'residence_prep'; EXCEPTION WHEN others THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE document_status_enum AS ENUM ('draft','final','signed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE client_activity_type_enum AS ENUM ('note','call','email','meeting'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE prospect_source_enum AS ENUM ('referral','cold_call','website','linkedin','event','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    "DO $$ BEGIN CREATE TYPE prospect_status_enum AS ENUM ('new','contacted','qualified','proposal_sent','negotiating','converted','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    import logging

    log = logging.getLogger(__name__)

    try:
        async with engine.begin() as conn:
            await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            for stmt in _ENUM_DDL_STATEMENTS:
                await conn.execute(text(stmt))
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        log.warning("DB init failed at startup (will retry on first request): %s", exc)

    # Ensure seed accounts are always present regardless of alembic state.
    # Hashes correspond to the production credentials in DASHBOARD_USERS.
    _SEED_USERS = [
        ("nexflow0", "$2b$12$dRrcZpwHi0LONPnazrVyzO9.3T73KoncfqQ09vSt7XSZbJwoxskZ."),
        ("nexflow1", "$2b$12$GawNP0wK3v5raT0tZfsp1eAjmirXtqAju4gag3QrkdI5gC.neyGc."),
        ("nexflow2", "$2b$12$Zj1JkMw5aR23RUH/RW1j0OC9jWRT3eIotXm31FSBWhpsW4x7yh7Aa"),
        ("nexflow3", "$2b$12$ygZq385slXjzOdNfsvypjexNwfwiixYxz0S/.vGqnrs.laRMxTsai"),
    ]
    try:
        async with engine.begin() as conn:
            for username, hashed_password in _SEED_USERS:
                await conn.execute(
                    text(
                        "INSERT INTO admin_users (username, hashed_password) "
                        "VALUES (:u, :h) "
                        "ON CONFLICT (username) DO UPDATE "
                        "SET hashed_password = EXCLUDED.hashed_password"
                    ).bindparams(u=username, h=hashed_password)
                )
    except Exception as exc:
        log.warning("Admin user seed failed at startup: %s", exc)

    # Ensure document templates are present regardless of alembic state.
    try:
        async with engine.begin() as conn:
            for name, ttype, body_html in SEED_TEMPLATES:
                await conn.execute(
                    text(
                        "INSERT INTO document_templates "
                        "(id, name, template_type, body_html, is_active, version) "
                        "SELECT uuid_generate_v4(), :name, CAST(:ttype AS template_type_enum), "
                        ":body_html, true, 1 "
                        "WHERE NOT EXISTS "
                        "(SELECT 1 FROM document_templates WHERE name = :name)"
                    ).bindparams(name=name, ttype=ttype, body_html=body_html)
                )
    except Exception as exc:
        log.warning("Document template seed failed at startup: %s", exc)

    yield


app = FastAPI(title="Nexflow Platform API", version="0.1.0", lifespan=lifespan)

# CORS — allow frontend in dev and configured production URL
origins = ["http://localhost:3000"]
if settings.frontend_url and settings.frontend_url not in origins:
    origins.append(settings.frontend_url)
for _extra in (o.strip() for o in settings.cors_extra_origins.split(",") if o.strip()):
    if _extra not in origins:
        origins.append(_extra)

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
app.include_router(candidate_job_orders_router)
app.include_router(workers_router)
app.include_router(clients_router)
app.include_router(compliance_router)
app.include_router(job_orders_router)
app.include_router(job_postings_router)
app.include_router(accommodations_router)
app.include_router(accommodation_assignments_router)
app.include_router(worker_accommodations_router)
app.include_router(vehicles_router)
app.include_router(transport_routes_router)
app.include_router(transport_assignments_router)
app.include_router(analytics_router)
app.include_router(templates_router)
app.include_router(documents_router)
app.include_router(worker_docs_router)
app.include_router(placements_router)
app.include_router(prospects_router)
app.include_router(worker_files_router)
app.include_router(hours_import_clients_router)
app.include_router(hours_import_batches_router)
app.include_router(assignments_hours_router)
app.include_router(aga_export_router)
app.include_router(invoices_router)
app.include_router(shifts_router)
app.include_router(worker_portal_router)
app.include_router(webhooks_router)
app.include_router(chatbot_router)
app.include_router(facebook_posts_router)
app.include_router(openclaw_router)
