"""
AGA by Streamsoft export router.

Generates CSV exports compatible with AGA (Aktywny Kadry-Płace by Streamsoft) import format.
AGA uses flat CSV files with semicolon delimiters — standard in the Polish payroll industry.

Endpoints:
  GET /api/v1/export/aga/workers          — employee records CSV
  GET /api/v1/export/aga/contracts        — contract details CSV
  GET /api/v1/export/aga/hours            — timesheet CSV (requires EUR-201 hours data)
  GET /api/v1/export/aga/assignments      — worker-client assignment mapping CSV

Query params (all endpoints):
  date_from   — ISO date (YYYY-MM-DD), inclusive
  date_to     — ISO date (YYYY-MM-DD), inclusive
  client_id   — filter by client UUID (optional)
"""

import csv
import io
from datetime import date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.assignments import Assignment
from app.models.clients import Client
from app.models.hours_import import WorkerHours
from app.models.workers import Worker

router = APIRouter(prefix="/api/v1/export/aga", tags=["aga-export"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_date(val: object) -> str:
    """Format a date/datetime as DD.MM.YYYY (AGA format)."""
    if val is None:
        return ""
    if hasattr(val, "strftime"):
        return val.strftime("%d.%m.%Y")
    return str(val)


def _fmt_decimal(val: object) -> str:
    """Format a decimal with comma separator (Polish locale)."""
    if val is None:
        return ""
    return str(val).replace(".", ",")


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    """Build a semicolon-delimited CSV StreamingResponse."""
    if not rows:
        output = io.StringIO()
        output.write("")
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv; charset=utf-8-sig",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    output = io.StringIO()
    writer = csv.DictWriter(
        output, fieldnames=list(rows[0].keys()), delimiter=";", lineterminator="\r\n"
    )
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)
    # Prepend BOM for Windows/Excel compatibility
    content = "\ufeff" + output.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _parse_date_param(val: str | None, name: str) -> date | None:
    if val is None:
        return None
    try:
        return date.fromisoformat(val)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"{name} must be YYYY-MM-DD")


# ── Workers export ─────────────────────────────────────────────────────────────

@router.get("/workers")
async def export_workers(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    client_id: str | None = Query(None),
) -> StreamingResponse:
    """Export worker/employee records for AGA import."""
    _parse_date_param(date_from, "date_from")
    _parse_date_param(date_to, "date_to")

    q = select(Worker).where(Worker.archived_at.is_(None))

    if client_id:
        # Filter workers currently assigned to this client
        q = q.where(Worker.current_client_id == UUID(client_id))

    result = await db.execute(q.order_by(Worker.last_name, Worker.first_name))
    workers = result.scalars().all()

    # AGA employee record fields (standard Polish payroll import layout)
    rows = []
    for w in workers:
        rows.append({
            "Kod_pracownika": str(w.id)[:8].upper(),  # short reference code
            "Nazwisko": w.last_name or "",
            "Imie": w.first_name or "",
            "PESEL": w.pesel or "",
            "Data_urodzenia": _fmt_date(w.date_of_birth),
            "Plec": getattr(w, "gender", None) or "",
            "Obywatelstwo": getattr(w, "citizenship", None) or "",
            "Narodowosc": w.nationality or "",
            "Rodzaj_dokumentu": getattr(w, "travel_document_type", None) or "",
            "Seria_dokumentu": getattr(w, "travel_document_series", None) or "",
            "Numer_dokumentu": getattr(w, "travel_document_number", None) or (w.passport_number or ""),
            "Waznosc_dokumentu": _fmt_date(getattr(w, "travel_document_expiry", None)),
            "Adres": w.address or "",
            "Telefon": w.phone or "",
            "Email": w.email or "",
            "Typ_zezwolenia": w.work_permit_type.value if w.work_permit_type else "",
            "Waznosc_zezwolenia": _fmt_date(w.work_permit_expiry),
            "Status_ZUS": w.zus_status or "",
            "Certyfikat_A1": w.a1_cert_status or "",
            "Waznosc_A1": _fmt_date(w.a1_cert_expiry),
            "Data_dodania": _fmt_date(w.created_at),
        })

    today = date.today().strftime("%Y%m%d")
    return _csv_response(rows, f"AGA_pracownicy_{today}.csv")


# ── Contracts export ───────────────────────────────────────────────────────────

@router.get("/contracts")
async def export_contracts(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    client_id: str | None = Query(None),
) -> StreamingResponse:
    """Export contract (assignment) details for AGA import."""
    d_from = _parse_date_param(date_from, "date_from")
    d_to = _parse_date_param(date_to, "date_to")

    q = select(Assignment, Worker, Client).join(
        Worker, Assignment.worker_id == Worker.id
    ).join(Client, Assignment.client_id == Client.id)

    if d_from:
        q = q.where(Assignment.start_date >= datetime.combine(d_from, datetime.min.time()))
    if d_to:
        q = q.where(
            (Assignment.end_date.is_(None)) |
            (Assignment.end_date <= datetime.combine(d_to, datetime.max.time()))
        )
    if client_id:
        q = q.where(Assignment.client_id == UUID(client_id))

    result = await db.execute(q.order_by(Assignment.start_date.desc()))
    rows_raw = result.all()

    rows = []
    for assignment, worker, client in rows_raw:
        rows.append({
            "Nr_umowy": str(assignment.id)[:8].upper(),
            "Kod_pracownika": str(worker.id)[:8].upper(),
            "Nazwisko_pracownika": worker.last_name or "",
            "Imie_pracownika": worker.first_name or "",
            "PESEL": worker.pesel or "",
            "Pracodawca_uzytkownik": client.company_name or "",
            "NIP_klienta": client.nip or "",
            "Stanowisko": assignment.position or "",
            "Data_od": _fmt_date(assignment.start_date),
            "Data_do": _fmt_date(assignment.end_date),
            "Stawka_pracodawcy": _fmt_decimal(assignment.employer_rate),
            "Stawka_pracownika": _fmt_decimal(assignment.worker_rate),
            "Waluta": assignment.currency.value if hasattr(assignment, "currency") and assignment.currency else "PLN",
        })

    today = date.today().strftime("%Y%m%d")
    return _csv_response(rows, f"AGA_umowy_{today}.csv")


# ── Hours export ───────────────────────────────────────────────────────────────

@router.get("/hours")
async def export_hours(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    client_id: str | None = Query(None),
) -> StreamingResponse:
    """Export timesheet/hours data for AGA payroll calculation."""
    d_from = _parse_date_param(date_from, "date_from")
    d_to = _parse_date_param(date_to, "date_to")

    q = select(WorkerHours, Worker).join(
        Worker, WorkerHours.worker_id == Worker.id, isouter=True
    ).where(WorkerHours.match_status == "matched")

    if d_from:
        q = q.where(WorkerHours.work_date >= d_from)
    if d_to:
        q = q.where(WorkerHours.work_date <= d_to)

    if client_id:
        # Filter by workers assigned to this client during the period
        q = q.where(Worker.current_client_id == UUID(client_id))

    result = await db.execute(q.order_by(WorkerHours.work_date, Worker.last_name))
    rows_raw = result.all()

    rows = []
    for wh, worker in rows_raw:
        rows.append({
            "Kod_pracownika": str(worker.id)[:8].upper() if worker else "",
            "Nazwisko": worker.last_name if worker else "",
            "Imie": worker.first_name if worker else "",
            "PESEL": worker.pesel if worker else "",
            "Data_pracy": _fmt_date(wh.work_date),
            "Godziny_normalne": _fmt_decimal(wh.hours_worked),
            "Nadgodziny": _fmt_decimal(wh.overtime_hours),
            "Typ_nieobecnosci": wh.absence_type or "",
            "Uwagi": wh.notes or "",
        })

    today = date.today().strftime("%Y%m%d")
    d_from_str = date_from or "all"
    d_to_str = date_to or "all"
    return _csv_response(rows, f"AGA_godziny_{d_from_str}_{d_to_str}.csv")


# ── Assignments export ─────────────────────────────────────────────────────────

@router.get("/assignments")
async def export_assignments(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    client_id: str | None = Query(None),
) -> StreamingResponse:
    """Export worker-client assignment mappings for 18/36-month limit tracking in AGA."""
    d_from = _parse_date_param(date_from, "date_from")
    d_to = _parse_date_param(date_to, "date_to")

    q = select(Assignment, Worker, Client).join(
        Worker, Assignment.worker_id == Worker.id
    ).join(Client, Assignment.client_id == Client.id)

    if d_from:
        q = q.where(Assignment.start_date >= datetime.combine(d_from, datetime.min.time()))
    if d_to:
        q = q.where(
            (Assignment.end_date.is_(None)) |
            (Assignment.start_date <= datetime.combine(d_to, datetime.max.time()))
        )
    if client_id:
        q = q.where(Assignment.client_id == UUID(client_id))

    result = await db.execute(q.order_by(Assignment.start_date.desc()))
    rows_raw = result.all()

    rows = []
    for assignment, worker, client in rows_raw:
        rows.append({
            "ID_delegowania": str(assignment.id)[:8].upper(),
            "Kod_pracownika": str(worker.id)[:8].upper(),
            "Nazwisko": worker.last_name or "",
            "Imie": worker.first_name or "",
            "PESEL": worker.pesel or "",
            "Pracodawca_uzytkownik": client.company_name or "",
            "NIP_klienta": client.nip or "",
            "Kraj_klienta": client.country or "PL",
            "Stanowisko": assignment.position or "",
            "Data_od": _fmt_date(assignment.start_date),
            "Data_do": _fmt_date(assignment.end_date),
            "Limit_18mies_od": _fmt_date(assignment.start_date),
        })

    today = date.today().strftime("%Y%m%d")
    return _csv_response(rows, f"AGA_delegowania_{today}.csv")
