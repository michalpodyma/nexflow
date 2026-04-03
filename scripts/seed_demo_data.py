#!/usr/bin/env python3
"""
Seed demo/test data for the Nexflow recruiter dashboard.

Creates:
  - 3 client companies + 3 client contacts
  - 5 workers (active/off/terminated mix, with compliance alert scenarios)
  - 5 assignments linking workers to clients
  - 12 candidates spread across all screening stages and the last 8 weeks
  - 3 job postings (OLX + Pracuj.pl)
  - 4 job orders with various statuses (open/sourcing/submitted/filled)
  - 6 candidate–job-order pipeline entries
  - 3 accommodations (Słubice-area properties)
  - 4 accommodation assignments (mix of current and past residents)
  - 3 vehicles (company fleet, some with expiring docs for compliance alerts)
  - 3 transport routes
  - 4 transport assignments
  - 1 demo admin user (username: demo, password: demo1234)

Idempotent: re-running skips rows that already exist (checked via unique
columns per entity). Compliance alert scenarios are refreshed on each run
so near-expiry dates remain relative to today.

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
from datetime import date as dt_date
from datetime import datetime, timedelta, timezone
from datetime import time as dt_time

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

# One primary contact per client (client_index = index into CLIENTS list)
CLIENT_CONTACTS = [
    {
        "client_index": 0,
        "name": "Hans Müller",
        "role": "HR Manager",
        "phone": "+4969112200",
        "email": "h.muller@mueller-logistik.de",
        "is_primary": True,
    },
    {
        "client_index": 1,
        "name": "Tomasz Kowalski",
        "role": "Operations Manager",
        "phone": "+48612345600",
        "email": "t.kowalski@magazynplus.pl",
        "is_primary": True,
    },
    {
        "client_index": 2,
        "name": "Jan van der Berg",
        "role": "CEO",
        "phone": "+31102345600",
        "email": "j.vandenberg@vandenberg-transport.nl",
        "is_primary": True,
    },
]

_NOW = datetime.now(timezone.utc)


def _days_ago(n: int) -> str:
    return (_NOW - timedelta(days=n)).isoformat()


def _date_in(days: int) -> str:
    """Return an ISO date string N days from today (positive = future)."""
    return (_NOW + timedelta(days=days)).strftime("%Y-%m-%d")


# Compliance alert scenarios require near-expiry dates relative to today.
# Workers 0-2 get fresh near-expiry values on every run (see COMPLIANCE_UPDATES).
WORKERS = [
    {
        "first_name": "Andriy",
        "last_name": "Kovalenko",
        "nationality": "UA",
        "phone": "+48500100201",
        "email": "a.kovalenko@example.com",
        "work_permit_type": "non_UE_permit",
        "work_permit_expiry": "2026-12-31",
        "health_cert_expiry": _date_in(22),  # expiring soon — compliance alert
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
        "work_permit_expiry": _date_in(27),  # expiring soon — compliance alert
        "health_cert_expiry": "2026-11-15",
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
        "health_cert_expiry": _date_in(10),  # expiring very soon — compliance alert
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
        "work_permit_expiry": "2025-05-31",  # already expired
        "health_cert_expiry": "2025-07-01",  # already expired
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
        "health_cert_expiry": "2026-01-10",  # expired
        "a1_cert_status": "not_required",
        "attendance_status": "terminated",
        "gdpr_consent": True,
    },
]

# Applied on every run to keep near-expiry dates current for compliance alerts.
COMPLIANCE_UPDATES = [
    {"phone": "+48500100201", "health_cert_expiry": _date_in(22)},
    {"phone": "+48500100202", "work_permit_expiry": _date_in(27)},
    {"phone": "+48500100203", "health_cert_expiry": _date_in(10)},
]

# Candidates spread across statuses and creation dates
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

# client_index references CLIENTS list; idempotency key = (title, client_id)
JOB_ORDERS = [
    {
        "client_index": 0,  # Müller Logistik
        "title": "[DEMO] Operator Wózka Widłowego — Frankfurt",
        "description": "Centrum logistyczne w okolicach Frankfurtu. 3 stanowiska. Zapewniamy zakwaterowanie.",
        "location": "Frankfurt am Main, DE",
        "headcount_needed": 3,
        "headcount_filled": 1,
        "urgency": "urgent",
        "status": "sourcing",
        "deadline": (_NOW + timedelta(days=30)).date(),
        "salary_min": 2800.00,
        "salary_max": 3400.00,
        "currency": "EUR",
    },
    {
        "client_index": 1,  # Magazyn Plus
        "title": "[DEMO] Magazynier / Picker — Poznań",
        "description": "Magazyn wysokiego składowania, zmiana dzienna i nocna. Umowa o pracę.",
        "location": "Poznań, PL",
        "headcount_needed": 5,
        "headcount_filled": 2,
        "urgency": "normal",
        "status": "submitted",
        "deadline": (_NOW + timedelta(days=14)).date(),
        "salary_min": 4500.00,
        "salary_max": 5500.00,
        "currency": "PLN",
    },
    {
        "client_index": 2,  # Van der Berg
        "title": "[DEMO] Kierowca C+E — Rotterdam",
        "description": "Transport międzynarodowy, trasy DE/NL/PL. Wymagana karta kierowcy i A1.",
        "location": "Rotterdam, NL",
        "headcount_needed": 2,
        "headcount_filled": 0,
        "urgency": "critical",
        "status": "open",
        "deadline": (_NOW + timedelta(days=7)).date(),
        "salary_min": 3200.00,
        "salary_max": 3800.00,
        "currency": "EUR",
    },
    {
        "client_index": 0,  # Müller Logistik
        "title": "[DEMO] Pakowacz / Line Worker — Frankfurt",
        "description": "Linia produkcyjna/pakowania w magazynie Müller. Wszystkie zmiany.",
        "location": "Frankfurt am Main, DE",
        "headcount_needed": 4,
        "headcount_filled": 4,
        "urgency": "normal",
        "status": "filled",
        "deadline": None,
        "salary_min": 2400.00,
        "salary_max": 2800.00,
        "currency": "EUR",
    },
]

# Pipeline entries linking candidates (by phone) to job orders (by list index).
CANDIDATE_JOB_ORDERS = [
    # Oleksandr Hrytsenko (forklift, screened_pass) → Müller Logistik forklift order
    {"candidate_phone": "+48600200104", "job_order_index": 0, "status": "submitted", "days_ago": 10},
    # Halyna Savchenko (warehouse, screened_pass) → Magazyn Plus order
    {"candidate_phone": "+48600200105", "job_order_index": 1, "status": "interviewing", "days_ago": 8},
    # Iryna Kovalchuk (warehouse, offered) → Magazyn Plus order
    {"candidate_phone": "+48600200107", "job_order_index": 1, "status": "offered", "days_ago": 5},
    # Serhiy Melnyk (forklift, hired) → Müller Logistik order — placed
    {"candidate_phone": "+48600200108", "job_order_index": 0, "status": "placed", "days_ago": 20},
    # Vasyl Lysenko (warehouse, hired) → Magazyn Plus order — placed
    {"candidate_phone": "+48600200109", "job_order_index": 1, "status": "placed", "days_ago": 25},
    # Bohdan Kravchenko (driver, screened_fail) → Van der Berg order — rejected
    {"candidate_phone": "+48600200106", "job_order_index": 2, "status": "rejected", "days_ago": 15},
]

ACCOMMODATIONS = [
    {
        "name": "[DEMO] ul. Kościuszki 12, Słubice",
        "address": "ul. Kościuszki 12",
        "city": "Słubice",
        "total_capacity": 12,
        "rooms_count": 6,
        "monthly_rent": 2500.00,
        "monthly_utilities": 400.00,
        "is_active": True,
        "notes": "6 pokoi po 2 osoby. Dostęp do kuchni wspólnej. Parking przed budynkiem.",
    },
    {
        "name": "[DEMO] ul. Sportowa 5, Słubice",
        "address": "ul. Sportowa 5",
        "city": "Słubice",
        "total_capacity": 8,
        "rooms_count": 4,
        "monthly_rent": 1800.00,
        "monthly_utilities": 300.00,
        "is_active": True,
        "notes": "4 pokoje dwuosobowe. Blisko przystanku autobusowego.",
    },
    {
        "name": "[DEMO] ul. Nadodrzańska 3, Słubice",
        "address": "ul. Nadodrzańska 3",
        "city": "Słubice",
        "total_capacity": 6,
        "rooms_count": 3,
        "monthly_rent": 1500.00,
        "monthly_utilities": 250.00,
        "is_active": True,
        "notes": "3 pokoje, blisko rzeki Odry. Przeznaczone dla kierowców.",
    },
]

# worker_index and accommodation_index reference WORKERS and ACCOMMODATIONS lists.
ACCOMMODATION_ASSIGNMENTS = [
    {
        "worker_index": 0,       # Andriy Kovalenko
        "accommodation_index": 0,  # ul. Kościuszki 12
        "room_number": "1A",
        "move_in_days_ago": 90,
        "move_out_days_ago": None,  # current resident
        "monthly_cost_to_worker": 650.00,
    },
    {
        "worker_index": 1,       # Olena Shevchenko
        "accommodation_index": 0,  # ul. Kościuszki 12
        "room_number": "1B",
        "move_in_days_ago": 75,
        "move_out_days_ago": None,  # current resident
        "monthly_cost_to_worker": 650.00,
    },
    {
        "worker_index": 2,       # Marcin Wójcik
        "accommodation_index": 1,  # ul. Sportowa 5
        "room_number": "2",
        "move_in_days_ago": 60,
        "move_out_days_ago": None,  # current resident
        "monthly_cost_to_worker": 500.00,
    },
    {
        "worker_index": 4,       # Katarzyna Zielińska (terminated)
        "accommodation_index": 2,  # ul. Nadodrzańska 3
        "room_number": "1",
        "move_in_days_ago": 120,
        "move_out_days_ago": 30,  # moved out 30 days ago
        "monthly_cost_to_worker": 450.00,
    },
]

VEHICLES = [
    {
        "make": "Ford",
        "model": "Transit",
        "year": 2021,
        "license_plate": "FSL 12345",
        "capacity": 9,
        "insurance_expiry_date": _date_in(15),   # expiring soon — compliance alert
        "inspection_expiry_date": _date_in(120),
        "is_active": True,
        "notes": "Bus pracowniczy — trasa Słubice → Rzepin",
    },
    {
        "make": "Volkswagen",
        "model": "Crafter",
        "year": 2020,
        "license_plate": "FSL 23456",
        "capacity": 15,
        "insurance_expiry_date": _date_in(200),
        "inspection_expiry_date": _date_in(8),   # expiring very soon — compliance alert
        "is_active": True,
        "notes": "Większy bus — trasa Słubice → Świecko",
    },
    {
        "make": "Renault",
        "model": "Master",
        "year": 2022,
        "license_plate": "FSL 34567",
        "capacity": 9,
        "insurance_expiry_date": _date_in(300),
        "inspection_expiry_date": _date_in(250),
        "is_active": True,
        "notes": "Nowy pojazd — rezerwa i trasa Frankfurt",
    },
]

# vehicle_index references VEHICLES list.
TRANSPORT_ROUTES = [
    {
        "name": "[DEMO] Słubice → Rzepin Amazon",
        "origin": "Słubice",
        "destination": "Rzepin (Amazon Logistics)",
        "vehicle_index": 0,  # Ford Transit FSL 12345
        "departure_time": dt_time(6, 0),
        "return_time": dt_time(15, 30),
        "is_active": True,
    },
    {
        "name": "[DEMO] Słubice → Świecko Logistik",
        "origin": "Słubice",
        "destination": "Świecko (Logistik Park)",
        "vehicle_index": 1,  # VW Crafter FSL 23456
        "departure_time": dt_time(5, 45),
        "return_time": dt_time(14, 15),
        "is_active": True,
    },
    {
        "name": "[DEMO] Słubice → Frankfurt (DE)",
        "origin": "Słubice",
        "destination": "Frankfurt am Main, Niemcy",
        "vehicle_index": 2,  # Renault Master FSL 34567
        "departure_time": dt_time(4, 30),
        "return_time": dt_time(20, 0),
        "is_active": True,
    },
]

# worker_index and route_index reference WORKERS and TRANSPORT_ROUTES lists.
TRANSPORT_ASSIGNMENTS = [
    {
        "worker_index": 0,  # Andriy Kovalenko
        "route_index": 0,   # Słubice → Rzepin Amazon
        "start_days_ago": 60,
        "end_days_ago": None,  # currently assigned
    },
    {
        "worker_index": 1,  # Olena Shevchenko
        "route_index": 0,   # Słubice → Rzepin Amazon
        "start_days_ago": 45,
        "end_days_ago": None,  # currently assigned
    },
    {
        "worker_index": 2,  # Marcin Wójcik
        "route_index": 1,   # Słubice → Świecko Logistik
        "start_days_ago": 30,
        "end_days_ago": None,  # currently assigned
    },
    {
        "worker_index": 3,  # Ivan Petrenko (off)
        "route_index": 1,   # Słubice → Świecko Logistik
        "start_days_ago": 90,
        "end_days_ago": 45,  # ended 45 days ago
    },
]

ADMIN_USER = {
    "username": "demo",
    "password": "demo1234",
}


# ---------------------------------------------------------------------------
# Seed logic
# ---------------------------------------------------------------------------


async def seed(conn: asyncpg.Connection) -> None:  # noqa: C901 (complexity acceptable for seed script)
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

    # --- Client contacts ---
    print("  → client contacts…")
    contact_count = 0
    for cc in CLIENT_CONTACTS:
        cid = client_ids[cc["client_index"]]
        existing = await conn.fetchval(
            "SELECT id FROM client_contacts WHERE client_id = $1 AND name = $2",
            uuid.UUID(cid), cc["name"],
        )
        if existing:
            contact_count += 1
            continue
        await conn.execute(
            """
            INSERT INTO client_contacts
              (id, client_id, name, role, phone, email, is_primary)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            """,
            str(uuid.uuid4()),
            uuid.UUID(cid), cc["name"], cc.get("role"),
            cc.get("phone"), cc.get("email"), cc["is_primary"],
        )
        contact_count += 1
    print(f"     {contact_count} client contacts ready")

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
            w["gdpr_consent"], _NOW,
        )
        worker_ids.append(wid)
    print(f"     {len(worker_ids)} workers ready")

    # --- Compliance alert scenarios ---
    # Always refresh near-expiry dates so alerts remain testable on re-runs.
    print("  → compliance alert scenarios…")
    for cu in COMPLIANCE_UPDATES:
        wid = await conn.fetchval(
            "SELECT id FROM workers WHERE phone = $1", cu["phone"]
        )
        if not wid:
            continue
        if "health_cert_expiry" in cu:
            health = datetime.fromisoformat(cu["health_cert_expiry"] + "T00:00:00+00:00")
            await conn.execute(
                "UPDATE workers SET health_cert_expiry = $1 WHERE id = $2", health, wid
            )
        if "work_permit_expiry" in cu:
            expiry = datetime.fromisoformat(cu["work_permit_expiry"] + "T00:00:00+00:00")
            await conn.execute(
                "UPDATE workers SET work_permit_expiry = $1 WHERE id = $2", expiry, wid
            )
    print("     compliance scenarios refreshed")

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
    candidate_ids: dict[str, str] = {}  # phone → id
    candidate_count = 0
    for cand in CANDIDATES:
        existing = await conn.fetchval(
            "SELECT id FROM candidates WHERE phone = $1", cand["phone"]
        )
        if existing:
            candidate_ids[cand["phone"]] = str(existing)
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
        candidate_ids[cand["phone"]] = cid
        candidate_count += 1
    print(f"     {candidate_count} candidates ready")

    # --- Job orders ---
    print("  → job orders…")
    job_order_ids: list[str] = []
    for jo in JOB_ORDERS:
        cid = client_ids[jo["client_index"]]
        existing = await conn.fetchval(
            "SELECT id FROM job_orders WHERE title = $1 AND client_id = $2",
            jo["title"], uuid.UUID(cid),
        )
        if existing:
            job_order_ids.append(str(existing))
            continue
        jid = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO job_orders
              (id, client_id, title, description, location,
               headcount_needed, headcount_filled, urgency, status,
               deadline, salary_min, salary_max, currency)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            """,
            jid,
            uuid.UUID(cid),
            jo["title"], jo.get("description"), jo.get("location"),
            jo["headcount_needed"], jo["headcount_filled"],
            jo["urgency"], jo["status"],
            jo.get("deadline"),
            jo.get("salary_min"), jo.get("salary_max"), jo["currency"],
        )
        job_order_ids.append(jid)
    print(f"     {len(job_order_ids)} job orders ready")

    # --- Candidate job order pipeline ---
    print("  → candidate–job-order pipeline…")
    cjo_count = 0
    for cjo in CANDIDATE_JOB_ORDERS:
        cand_id = candidate_ids.get(cjo["candidate_phone"])
        if not cand_id or cjo["job_order_index"] >= len(job_order_ids):
            continue
        jo_id = job_order_ids[cjo["job_order_index"]]
        existing = await conn.fetchval(
            "SELECT id FROM candidate_job_orders WHERE candidate_id = $1 AND job_order_id = $2",
            uuid.UUID(cand_id), uuid.UUID(jo_id),
        )
        if existing:
            cjo_count += 1
            continue
        submitted_at = _NOW - timedelta(days=cjo["days_ago"])
        await conn.execute(
            """
            INSERT INTO candidate_job_orders
              (id, candidate_id, job_order_id, status, submitted_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6)
            """,
            str(uuid.uuid4()),
            uuid.UUID(cand_id), uuid.UUID(jo_id),
            cjo["status"], submitted_at, submitted_at,
        )
        cjo_count += 1
    print(f"     {cjo_count} pipeline entries ready")

    # --- Accommodations ---
    print("  → accommodations…")
    accommodation_ids: list[str] = []
    for acc in ACCOMMODATIONS:
        existing = await conn.fetchval(
            "SELECT id FROM accommodations WHERE name = $1", acc["name"]
        )
        if existing:
            accommodation_ids.append(str(existing))
            continue
        aid = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO accommodations
              (id, name, address, city, total_capacity, rooms_count,
               monthly_rent, monthly_utilities, is_active, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            """,
            aid,
            acc["name"], acc.get("address"), acc.get("city"),
            acc["total_capacity"], acc.get("rooms_count"),
            acc.get("monthly_rent"), acc.get("monthly_utilities"),
            acc["is_active"], acc.get("notes"),
        )
        accommodation_ids.append(aid)
    print(f"     {len(accommodation_ids)} accommodations ready")

    # --- Accommodation assignments ---
    print("  → accommodation assignments…")
    acc_assign_count = 0
    for aa in ACCOMMODATION_ASSIGNMENTS:
        if aa["worker_index"] >= len(worker_ids) or aa["accommodation_index"] >= len(accommodation_ids):
            continue
        wid = worker_ids[aa["worker_index"]]
        acc_id = accommodation_ids[aa["accommodation_index"]]
        existing = await conn.fetchval(
            """
            SELECT id FROM accommodation_assignments
            WHERE worker_id = $1 AND accommodation_id = $2
            """,
            uuid.UUID(wid), uuid.UUID(acc_id),
        )
        if existing:
            acc_assign_count += 1
            continue
        move_in = _NOW - timedelta(days=aa["move_in_days_ago"])
        move_out = (
            _NOW - timedelta(days=aa["move_out_days_ago"])
            if aa.get("move_out_days_ago") is not None
            else None
        )
        await conn.execute(
            """
            INSERT INTO accommodation_assignments
              (id, worker_id, accommodation_id, room_number,
               move_in_date, move_out_date, monthly_cost_to_worker)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            """,
            str(uuid.uuid4()),
            uuid.UUID(wid), uuid.UUID(acc_id),
            aa.get("room_number"), move_in, move_out,
            aa.get("monthly_cost_to_worker"),
        )
        acc_assign_count += 1
    print(f"     {acc_assign_count} accommodation assignments ready")

    # --- Vehicles ---
    print("  → vehicles…")
    vehicle_ids: list[str] = []
    for v in VEHICLES:
        existing = await conn.fetchval(
            "SELECT id FROM vehicles WHERE license_plate = $1", v["license_plate"]
        )
        if existing:
            vehicle_ids.append(str(existing))
            continue
        vid = str(uuid.uuid4())
        ins_exp = dt_date.fromisoformat(v["insurance_expiry_date"]) if v.get("insurance_expiry_date") else None
        insp_exp = dt_date.fromisoformat(v["inspection_expiry_date"]) if v.get("inspection_expiry_date") else None
        await conn.execute(
            """
            INSERT INTO vehicles
              (id, make, model, year, license_plate, capacity,
               insurance_expiry_date, inspection_expiry_date, is_active, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            """,
            vid,
            v["make"], v["model"], v.get("year"), v["license_plate"],
            v["capacity"], ins_exp, insp_exp, v["is_active"], v.get("notes"),
        )
        vehicle_ids.append(vid)
    print(f"     {len(vehicle_ids)} vehicles ready")

    # --- Transport routes ---
    print("  → transport routes…")
    route_ids: list[str] = []
    for route in TRANSPORT_ROUTES:
        existing = await conn.fetchval(
            "SELECT id FROM transport_routes WHERE name = $1", route["name"]
        )
        if existing:
            route_ids.append(str(existing))
            continue
        rid = str(uuid.uuid4())
        vehicle_id = (
            uuid.UUID(vehicle_ids[route["vehicle_index"]])
            if route.get("vehicle_index") is not None and route["vehicle_index"] < len(vehicle_ids)
            else None
        )
        await conn.execute(
            """
            INSERT INTO transport_routes
              (id, name, origin, destination, vehicle_id,
               departure_time, return_time, is_active)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            """,
            rid,
            route["name"], route["origin"], route["destination"],
            vehicle_id,
            route.get("departure_time"), route.get("return_time"),
            route["is_active"],
        )
        route_ids.append(rid)
    print(f"     {len(route_ids)} transport routes ready")

    # --- Transport assignments ---
    print("  → transport assignments…")
    ta_count = 0
    for ta in TRANSPORT_ASSIGNMENTS:
        if ta["worker_index"] >= len(worker_ids) or ta["route_index"] >= len(route_ids):
            continue
        wid = worker_ids[ta["worker_index"]]
        rid = route_ids[ta["route_index"]]
        start_date = (_NOW - timedelta(days=ta["start_days_ago"])).date()
        existing = await conn.fetchval(
            """
            SELECT id FROM transport_assignments
            WHERE worker_id = $1 AND route_id = $2
            """,
            uuid.UUID(wid), uuid.UUID(rid),
        )
        if existing:
            ta_count += 1
            continue
        end_date = (
            (_NOW - timedelta(days=ta["end_days_ago"])).date()
            if ta.get("end_days_ago") is not None
            else None
        )
        await conn.execute(
            """
            INSERT INTO transport_assignments
              (id, worker_id, route_id, start_date, end_date)
            VALUES ($1,$2,$3,$4,$5)
            """,
            str(uuid.uuid4()),
            uuid.UUID(wid), uuid.UUID(rid),
            start_date, end_date,
        )
        ta_count += 1
    print(f"     {ta_count} transport assignments ready")

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
        print("     demo user created (username=demo, password=demo1234)")
    else:
        print("     demo user already exists")

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
