#!/usr/bin/env python3
"""
Seed demo/test data for the Nexflow recruiter dashboard.

Creates:
  - 3 client companies
  - 5 workers (active/off/terminated mix)
  - 5 assignments linking workers to clients
  - 12 candidates spread across all screening stages and the last 8 weeks
  - 3 job postings (OLX + Pracuj.pl)
  - 1 demo admin user (username: demo, password: demo1234)

Idempotent: re-running skips rows that already exist (checked via
a sentinel marker in the notes/company_name columns or via username).

Usage (from the repo root, with Docker running):
    docker compose exec api python /app/../scripts/seed_demo_data.py

Or locally (with a running Postgres accessible at localhost):
    DB_USER=nexflow DB_PASSWORD=nexflow_dev_password DB_NAME=nexflow_db \
      python scripts/seed_demo_data.py
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg  # type: ignore[import-untyped]

# ---------------------------------------------------------------------------
# Database connection
# ---------------------------------------------------------------------------

def _db_url() -> str:
    """Build a plain asyncpg DSN (not SQLAlchemy+asyncpg)."""
    raw = os.environ.get("DATABASE_URL", "")
    if raw:
        # Strip the SQLAlchemy dialect prefix if present
        raw = raw.replace("postgresql+asyncpg://", "postgresql://")
        return raw

    user = os.environ.get("DB_USER", "nexflow")
    password = os.environ.get("DB_PASSWORD", "nexflow_dev_password")
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    name = os.environ.get("DB_NAME", "nexflow_db")
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

CLIENTS = [
    {
        "company_name": "[DEMO] Müller Logistik GmbH",
        "nip": None,
        "vat_eu": "DE123456789",
        "address": "Industriestraße 42",
        "city": "Frankfurt am Main",
        "postal_code": "60325",
        "country": "DE",
        "phone": "+4969112233",
        "email": "kontakt@mueller-logistik.de",
        "account_manager_name": "Anna Kowalska",
        "payment_terms_days": 30,
        "currency": "EUR",
        "is_active": True,
    },
    {
        "company_name": "[DEMO] Magazyn Plus Sp. z o.o.",
        "nip": "5213012345",
        "vat_eu": None,
        "address": "ul. Magazynowa 18",
        "city": "Poznań",
        "postal_code": "61-001",
        "country": "PL",
        "phone": "+48612345678",
        "email": "biuro@magazynplus.pl",
        "account_manager_name": "Piotr Nowak",
        "payment_terms_days": 14,
        "currency": "PLN",
        "is_active": True,
    },
    {
        "company_name": "[DEMO] Van der Berg Transport B.V.",
        "nip": None,
        "vat_eu": "NL123456789B01",
        "address": "Havenstraat 7",
        "city": "Rotterdam",
        "postal_code": "3011 AA",
        "country": "NL",
        "phone": "+31102345678",
        "email": "hr@vandenberg-transport.nl",
        "account_manager_name": "Karolina Wiśniewska",
        "payment_terms_days": 45,
        "currency": "EUR",
        "is_active": True,
    },
]

WORKERS = [
    {
        "first_name": "Andriy",
        "last_name": "Kovalenko",
        "nationality": "UA",
        "phone": "+48500100201",
        "email": "a.kovalenko@example.com",
        "work_permit_type": "non_UE_permit",
        "work_permit_expiry": "2026-12-31",
        "health_cert_expiry": "2025-09-30",
        "a1_cert_status": "valid",
        "attendance_status": "active",
        "gdpr_consent": True,
    },
    {
        "first_name": "Olena",
        "last_name": "Shevchenko",
        "nationality": "UA",
        "phone": "+48500100202",
        "email": "o.shevchenko@example.com",
        "work_permit_type": "non_UE_permit",
        "work_permit_expiry": "2026-06-30",
        "health_cert_expiry": "2025-11-15",
        "a1_cert_status": "pending",
        "attendance_status": "active",
        "gdpr_consent": True,
    },
    {
        "first_name": "Marcin",
        "last_name": "Wójcik",
        "nationality": "PL",
        "phone": "+48500100203",
        "email": "m.wojcik@example.com",
        "work_permit_type": "UE",
        "work_permit_expiry": None,
        "health_cert_expiry": "2026-03-20",
        "a1_cert_status": "valid",
        "attendance_status": "active",
        "gdpr_consent": True,
    },
    {
        "first_name": "Ivan",
        "last_name": "Petrenko",
        "nationality": "UA",
        "phone": "+48500100204",
        "email": "i.petrenko@example.com",
        "work_permit_type": "non_UE_permit",
        "work_permit_expiry": "2025-05-31",
        "health_cert_expiry": "2025-07-01",
        "a1_cert_status": None,
        "attendance_status": "off",
        "gdpr_consent": True,
    },
    {
        "first_name": "Katarzyna",
        "last_name": "Zielińska",
        "nationality": "PL",
        "phone": "+48500100205",
        "email": "k.zielinska@example.com",
        "work_permit_type": "UE",
        "work_permit_expiry": None,
        "health_cert_expiry": "2026-01-10",
        "a1_cert_status": "not_required",
        "attendance_status": "terminated",
        "gdpr_consent": True,
    },
]

# Candidates spread across statuses and creation dates
_NOW = datetime.now(timezone.utc)

def _days_ago(n: int) -> str:
    return (_NOW - timedelta(days=n)).isoformat()

CANDIDATES = [
    # Recently applied — new
    {
        "first_name": "Taras", "last_name": "Bondarenko",
        "phone": "+48600200101", "email": "t.bondarenko@mail.com",
        "nationality": "UA", "availability_from": "2026-04-15",
        "preferred_position": "warehouse_picker",
        "languages": ["uk", "pl"],
        "screening_status": "new", "gdpr_consent": True,
        "created_at_offset_days": 1,
    },
    {
        "first_name": "Natalia", "last_name": "Marchuk",
        "phone": "+48600200102", "email": None,
        "nationality": "UA", "availability_from": "2026-04-20",
        "preferred_position": "warehouse_picker",
        "languages": ["uk"],
        "screening_status": "new", "gdpr_consent": True,
        "created_at_offset_days": 2,
    },
    # Chatbot in progress
    {
        "first_name": "Dmytro", "last_name": "Tkachuk",
        "phone": "+48600200103", "email": "d.tkachuk@mail.com",
        "nationality": "UA", "availability_from": "2026-05-01",
        "preferred_position": "forklift_operator",
        "languages": ["uk", "en"],
        "screening_status": "chatbot_in_progress", "gdpr_consent": True,
        "created_at_offset_days": 5,
    },
    # Screened pass
    {
        "first_name": "Oleksandr", "last_name": "Hrytsenko",
        "phone": "+48600200104", "email": "o.hrytsenko@mail.com",
        "nationality": "UA", "availability_from": "2026-04-10",
        "preferred_position": "forklift_operator",
        "languages": ["uk", "pl", "de"],
        "screening_status": "screened_pass", "screening_score": 82,
        "gdpr_consent": True, "created_at_offset_days": 12,
        "notes": "Strong forklift experience, speaks German",
    },
    {
        "first_name": "Halyna", "last_name": "Savchenko",
        "phone": "+48600200105", "email": "h.savchenko@mail.com",
        "nationality": "UA", "availability_from": "2026-04-05",
        "preferred_position": "warehouse_picker",
        "languages": ["uk", "pl"],
        "screening_status": "screened_pass", "screening_score": 75,
        "gdpr_consent": True, "created_at_offset_days": 18,
    },
    # Screened fail
    {
        "first_name": "Bohdan", "last_name": "Kravchenko",
        "phone": "+48600200106", "email": None,
        "nationality": "UA", "availability_from": "2026-05-15",
        "preferred_position": "logistics_driver",
        "languages": ["uk"],
        "screening_status": "screened_fail", "screening_score": 34,
        "gdpr_consent": True, "created_at_offset_days": 20,
        "notes": "No valid driver license for DE",
    },
    # Offered
    {
        "first_name": "Iryna", "last_name": "Kovalchuk",
        "phone": "+48600200107", "email": "i.kovalchuk@mail.com",
        "nationality": "UA", "availability_from": "2026-04-01",
        "preferred_position": "warehouse_picker",
        "languages": ["uk", "pl", "en"],
        "screening_status": "offered", "screening_score": 90,
        "gdpr_consent": True, "created_at_offset_days": 25,
        "contacted_at_offset_days": 10,
    },
    # Hired
    {
        "first_name": "Serhiy", "last_name": "Melnyk",
        "phone": "+48600200108", "email": "s.melnyk@mail.com",
        "nationality": "UA", "availability_from": "2026-03-01",
        "preferred_position": "forklift_operator",
        "languages": ["uk", "de"],
        "screening_status": "hired", "screening_score": 95,
        "gdpr_consent": True, "created_at_offset_days": 35,
        "contacted_at_offset_days": 20,
        "notes": "Placed at Müller Logistik, Frankfurt",
    },
    {
        "first_name": "Vasyl", "last_name": "Lysenko",
        "phone": "+48600200109", "email": "v.lysenko@mail.com",
        "nationality": "UA", "availability_from": "2026-03-15",
        "preferred_position": "warehouse_picker",
        "languages": ["uk", "pl"],
        "screening_status": "hired", "screening_score": 88,
        "gdpr_consent": True, "created_at_offset_days": 40,
        "contacted_at_offset_days": 25,
        "notes": "Placed at Magazyn Plus, Poznań",
    },
    # Rejected
    {
        "first_name": "Mykola", "last_name": "Sydorenko",
        "phone": "+48600200110", "email": None,
        "nationality": "UA", "availability_from": "2026-04-30",
        "preferred_position": "logistics_driver",
        "languages": ["uk"],
        "screening_status": "rejected", "gdpr_consent": True,
        "created_at_offset_days": 45,
        "notes": "No documents — work permit expired",
    },
    # Extra new candidates to build up count (created over past 8 weeks)
    {
        "first_name": "Liudmyla", "last_name": "Bondar",
        "phone": "+48600200111", "email": "l.bondar@mail.com",
        "nationality": "UA", "availability_from": "2026-05-01",
        "preferred_position": "warehouse_picker",
        "languages": ["uk", "pl"],
        "screening_status": "new", "gdpr_consent": True,
        "created_at_offset_days": 50,
    },
    {
        "first_name": "Ruslan", "last_name": "Fedorenko",
        "phone": "+48600200112", "email": "r.fedorenko@mail.com",
        "nationality": "UA", "availability_from": "2026-05-10",
        "preferred_position": "other",
        "languages": ["uk", "en"],
        "screening_status": "screened_pass", "screening_score": 70,
        "gdpr_consent": True, "created_at_offset_days": 55,
    },
]

JOB_POSTINGS = [
    {
        "platform": "olx",
        "title": "[DEMO] Operator Wózka Widłowego — Frankfurt, Niemcy",
        "location": "Frankfurt am Main, DE",
        "salary_min": 2800,
        "salary_max": 3400,
        "currency": "EUR",
        "description": (
            "Szukamy operatorów wózka widłowego do pracy w nowoczesnym centrum "
            "logistycznym w okolicach Frankfurtu. Zapewniamy zakwaterowanie i transport."
        ),
        "status": "active",
    },
    {
        "platform": "pracuj",
        "title": "[DEMO] Magazynier / Picker — Poznań",
        "location": "Poznań, PL",
        "salary_min": 4500,
        "salary_max": 5500,
        "currency": "PLN",
        "description": (
            "Praca w magazynie wysokiego składowania. Mile widziane doświadczenie "
            "w kompletacji zamówień. Umowa zlecenie lub o pracę."
        ),
        "status": "active",
    },
    {
        "platform": "olx",
        "title": "[DEMO] Kierowca C+E — Rotterdam, Holandia",
        "location": "Rotterdam, NL",
        "salary_min": 3200,
        "salary_max": 3800,
        "currency": "EUR",
        "description": (
            "Rekrutujemy kierowców z kategorią C+E do transportu międzynarodowego "
            "dla klienta z Holandii. Wymagana karta kierowcy i aktualne badania."
        ),
        "status": "active",
    },
]

ADMIN_USER = {
    "username": "demo",
    "password": "demo1234",
}


# ---------------------------------------------------------------------------
# Seed logic
# ---------------------------------------------------------------------------

async def seed(conn: asyncpg.Connection) -> None:
    print("🌱 Seeding demo data…")

    # --- Clients ---
    print("  → clients…")
    client_ids: list[str] = []
    for c in CLIENTS:
        existing = await conn.fetchval(
            "SELECT id FROM clients WHERE company_name = $1", c["company_name"]
        )
        if existing:
            client_ids.append(str(existing))
            continue
        cid = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO clients
              (id, company_name, nip, vat_eu, address, city, postal_code, country,
               phone, email, account_manager_name, payment_terms_days, currency, is_active)
            VALUES
              ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            """,
            cid,
            c["company_name"], c["nip"], c["vat_eu"],
            c["address"], c["city"], c["postal_code"], c["country"],
            c["phone"], c["email"], c["account_manager_name"],
            c["payment_terms_days"], c["currency"], c["is_active"],
        )
        client_ids.append(cid)
    print(f"     {len(client_ids)} clients ready")

    # --- Workers ---
    print("  → workers…")
    worker_ids: list[str] = []
    for w in WORKERS:
        existing = await conn.fetchval(
            "SELECT id FROM workers WHERE phone = $1", w["phone"]
        )
        if existing:
            worker_ids.append(str(existing))
            continue
        wid = str(uuid.uuid4())
        expiry = (
            datetime.fromisoformat(w["work_permit_expiry"] + "T00:00:00+00:00")
            if w["work_permit_expiry"]
            else None
        )
        health = (
            datetime.fromisoformat(w["health_cert_expiry"] + "T00:00:00+00:00")
            if w["health_cert_expiry"]
            else None
        )
        now_ts = _NOW
        await conn.execute(
            """
            INSERT INTO workers
              (id, first_name, last_name, nationality, phone, email,
               work_permit_type, work_permit_expiry, health_cert_expiry,
               a1_cert_status, attendance_status,
               gdpr_consent, gdpr_consent_at)
            VALUES
              ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            """,
            wid,
            w["first_name"], w["last_name"], w["nationality"],
            w["phone"], w["email"],
            w["work_permit_type"], expiry, health,
            w["a1_cert_status"], w["attendance_status"],
            w["gdpr_consent"], now_ts,
        )
        worker_ids.append(wid)
    print(f"     {len(worker_ids)} workers ready")

    # --- Assignments (active workers only, paired with first two clients) ---
    print("  → assignments…")
    assignment_count = 0
    for i, wid in enumerate(worker_ids[:3]):
        cid = client_ids[i % len(client_ids)]
        existing = await conn.fetchval(
            "SELECT id FROM assignments WHERE worker_id = $1 AND is_active = true", uuid.UUID(wid)
        )
        if existing:
            assignment_count += 1
            continue
        positions = ["Operator wózka widłowego", "Magazynier / picker", "Kierowca C+E"]
        employer_rates = [3200.0, 28.5 * 22, 3500.0]  # monthly EUR / PLN daily×22
        worker_rates = [2600.0, 22.0 * 22, 2900.0]
        aid = str(uuid.uuid4())
        start = _NOW - timedelta(days=60 + i * 10)
        await conn.execute(
            """
            INSERT INTO assignments
              (id, worker_id, client_id, position,
               employer_rate, worker_rate,
               start_date, is_active)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            """,
            aid,
            uuid.UUID(wid), uuid.UUID(cid),
            positions[i % len(positions)],
            employer_rates[i % len(employer_rates)],
            worker_rates[i % len(worker_rates)],
            start, True,
        )
        assignment_count += 1
    print(f"     {assignment_count} assignments ready")

    # --- Job postings ---
    print("  → job postings…")
    posting_ids: list[str] = []
    for jp in JOB_POSTINGS:
        existing = await conn.fetchval(
            "SELECT id FROM job_postings WHERE title = $1", jp["title"]
        )
        if existing:
            posting_ids.append(str(existing))
            continue
        pid = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO job_postings
              (id, platform, title, location,
               salary_min, salary_max, currency,
               description, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            """,
            pid,
            jp["platform"], jp["title"], jp["location"],
            jp["salary_min"], jp["salary_max"], jp.get("currency"),
            jp["description"], jp["status"],
        )
        posting_ids.append(pid)
    print(f"     {len(posting_ids)} job postings ready")

    # --- Candidates ---
    print("  → candidates…")
    candidate_count = 0
    for cand in CANDIDATES:
        existing = await conn.fetchval(
            "SELECT id FROM candidates WHERE phone = $1", cand["phone"]
        )
        if existing:
            candidate_count += 1
            continue
        cid = str(uuid.uuid4())
        avail = datetime.fromisoformat(cand["availability_from"] + "T00:00:00+00:00")
        offset_days = cand.get("created_at_offset_days", 0)
        created_at = _NOW - timedelta(days=offset_days)
        contacted_at = None
        if "contacted_at_offset_days" in cand:
            contacted_at = _NOW - timedelta(days=cand["contacted_at_offset_days"])

        # Assign to the first job posting that matches the preferred position
        job_posting_id = posting_ids[0] if posting_ids else None

        await conn.execute(
            """
            INSERT INTO candidates
              (id, first_name, last_name, phone, email,
               nationality, availability_from,
               preferred_position, languages,
               screening_status, screening_score,
               notes, contacted_at, job_posting_id,
               gdpr_consent, gdpr_consent_at, created_at, updated_at)
            VALUES
              ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18)
            """,
            cid,
            cand["first_name"], cand["last_name"],
            cand["phone"], cand.get("email"),
            cand["nationality"], avail,
            cand["preferred_position"],
            json.dumps(cand["languages"]),
            cand["screening_status"], cand.get("screening_score"),
            cand.get("notes"), contacted_at, job_posting_id,
            cand["gdpr_consent"], created_at,
            created_at, created_at,
        )
        candidate_count += 1
    print(f"     {candidate_count} candidates ready")

    # --- Admin demo user ---
    print("  → admin user…")
    existing_user = await conn.fetchval(
        "SELECT id FROM admin_users WHERE username = $1", ADMIN_USER["username"]
    )
    if not existing_user:
        from passlib.context import CryptContext  # type: ignore[import-untyped]
        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed = pwd_ctx.hash(ADMIN_USER["password"])
        uid = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO admin_users (id, username, hashed_password, is_active) VALUES ($1,$2,$3,$4)",
            uid, ADMIN_USER["username"], hashed, True,
        )
        print(f"     demo user created (username=demo, password=demo1234)")
    else:
        print(f"     demo user already exists")

    print("✅ Done.")


async def main() -> None:
    dsn = _db_url()
    print(f"Connecting to {dsn.split('@')[-1]}…")
    conn = await asyncpg.connect(dsn)
    try:
        await seed(conn)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
