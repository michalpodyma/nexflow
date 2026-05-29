"""
Spreadsheet hours import router.

Endpoints:
  POST   /api/v1/clients/{client_id}/hours-import/upload  — upload file, parse, return headers + suggestions
  GET    /api/v1/clients/{client_id}/column-mappings       — get saved column mappings
  PUT    /api/v1/clients/{client_id}/column-mappings       — save/update column mappings
  POST   /api/v1/hours-import/{batch_id}/validate          — apply mappings + validate → preview rows
  POST   /api/v1/hours-import/{batch_id}/commit            — commit validated rows to worker_hours
  GET    /api/v1/hours-import/{batch_id}                   — batch status + summary
  GET    /api/v1/clients/{client_id}/hours-import           — import history (paginated)
  DELETE /api/v1/hours-import/{batch_id}                   — cancel pending batch
  GET    /api/v1/assignments/{assignment_id}/hours          — hours for invoice generation
"""

import io
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.clients import Client
from app.models.hours_import import ClientColumnMapping, HoursImportBatch, WorkerHours
from app.models.workers import Worker
from app.schemas.hours_import import (
    ApplyMappingsRequest,
    ColumnMappingItem,
    ColumnMappingRead,
    ColumnMappingSave,
    CommitResponse,
    HoursImportBatchRead,
    PaginatedBatches,
    PreviewResponse,
    PreviewRow,
    UploadResponse,
    WorkerHoursSummary,
)
from app.services import b2
from app.services.hours_import import (
    match_workers,
    parse_spreadsheet,
    suggest_column_mappings,
    validate_rows,
)
from app.services.invoice_service import create_draft_from_batch

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

clients_router = APIRouter(prefix="/api/v1/clients", tags=["hours-import"])
batches_router = APIRouter(prefix="/api/v1/hours-import", tags=["hours-import"])
assignments_hours_router = APIRouter(prefix="/api/v1/assignments", tags=["hours-import"])


# ── Upload ──────────────────────────────────────────────────────────────────────

@clients_router.post("/{client_id}/hours-import/upload", response_model=UploadResponse, status_code=201)
async def upload_hours_file(
    client_id: UUID,
    file: UploadFile,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UploadResponse:
    """Upload a spreadsheet file, parse headers, return column suggestions."""
    # Verify client exists
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    if client_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Client not found")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")

    content_type = file.content_type or "application/octet-stream"
    original_name = file.filename or "upload.xlsx"

    # Parse the spreadsheet
    try:
        rows = parse_spreadsheet(contents, content_type)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse spreadsheet: {exc}") from exc

    if not rows:
        raise HTTPException(status_code=422, detail="Spreadsheet is empty or could not be read")

    headers = list(rows[0].keys())

    # Load saved column mappings for this client
    mappings_result = await db.execute(
        select(ClientColumnMapping).where(ClientColumnMapping.client_id == client_id)
    )
    existing = {m.spreadsheet_header: m.internal_field for m in mappings_result.scalars().all()}

    suggestions = suggest_column_mappings(headers, existing)

    # Store file in B2
    batch_id = uuid.uuid4()
    storage_key = f"hours-import/{client_id}/{batch_id}/{original_name}"
    try:
        await b2.upload_file(storage_key, io.BytesIO(contents), content_type)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"B2 upload failed: {exc}") from exc

    username: str | None = None
    if hasattr(current_user, "email"):
        username = current_user.email

    batch = HoursImportBatch(
        id=batch_id,
        client_id=client_id,
        original_filename=original_name,
        storage_key=storage_key,
        content_type=content_type,
        file_size=len(contents),
        status="pending",
        raw_headers=headers,
        row_count=len(rows),
        uploaded_by_user=username,
    )
    db.add(batch)
    await db.commit()

    return UploadResponse(
        batch_id=batch_id,
        headers=headers,
        suggested_mappings=suggestions,
        row_count=len(rows),
    )


# ── Column mappings ────────────────────────────────────────────────────────────

@clients_router.get("/{client_id}/column-mappings", response_model=ColumnMappingRead)
async def get_column_mappings(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ColumnMappingRead:
    result = await db.execute(
        select(ClientColumnMapping).where(ClientColumnMapping.client_id == client_id)
    )
    items = result.scalars().all()
    return ColumnMappingRead(
        client_id=client_id,
        mappings=[ColumnMappingItem(spreadsheet_header=m.spreadsheet_header, internal_field=m.internal_field) for m in items],
    )


@clients_router.put("/{client_id}/column-mappings", response_model=ColumnMappingRead)
async def save_column_mappings(
    client_id: UUID,
    body: ColumnMappingSave,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ColumnMappingRead:
    """Upsert saved column mappings for a client (one per internal_field)."""
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    if client_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Client not found")

    # Load existing and update or create
    existing_result = await db.execute(
        select(ClientColumnMapping).where(ClientColumnMapping.client_id == client_id)
    )
    existing_map = {m.internal_field: m for m in existing_result.scalars().all()}

    for item in body.mappings:
        if item.internal_field in existing_map:
            existing_map[item.internal_field].spreadsheet_header = item.spreadsheet_header
            existing_map[item.internal_field].updated_at = datetime.now(UTC)
        else:
            db.add(ClientColumnMapping(
                client_id=client_id,
                spreadsheet_header=item.spreadsheet_header,
                internal_field=item.internal_field,
            ))

    await db.commit()

    # Reload
    reload_result = await db.execute(
        select(ClientColumnMapping).where(ClientColumnMapping.client_id == client_id)
    )
    items = reload_result.scalars().all()
    return ColumnMappingRead(
        client_id=client_id,
        mappings=[ColumnMappingItem(spreadsheet_header=m.spreadsheet_header, internal_field=m.internal_field) for m in items],
    )


# ── Batch validate (apply mappings + preview) ──────────────────────────────────

@batches_router.post("/{batch_id}/validate", response_model=PreviewResponse)
async def validate_batch(
    batch_id: UUID,
    body: ApplyMappingsRequest,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PreviewResponse:
    """Apply column mappings, match workers, validate rows, return preview."""
    batch_result = await db.execute(
        select(HoursImportBatch).where(HoursImportBatch.id == batch_id)
    )
    batch = batch_result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status == "imported":
        raise HTTPException(status_code=400, detail="Batch already imported")

    # Download file from B2 to re-parse
    try:
        url = await b2.generate_presigned_download_url(batch.storage_key)
        import urllib.request
        with urllib.request.urlopen(url, timeout=30) as resp:
            file_bytes = resp.read()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not retrieve file from storage: {exc}") from exc

    rows = parse_spreadsheet(file_bytes, batch.content_type)

    # Build worker lookup
    workers_result = await db.execute(
        select(Worker).where(Worker.archived_at.is_(None))
    )
    all_workers = workers_result.scalars().all()
    worker_lookup: dict = {
        "by_pesel": {},
        "by_name": {},
    }
    for w in all_workers:
        w_id = str(w.id)
        if w.pesel:
            worker_lookup["by_pesel"][w.pesel] = w_id
        norm = f"{w.first_name} {w.last_name}".lower()
        worker_lookup["by_name"][norm] = w_id

    rows = match_workers(rows, body.mappings, worker_lookup)
    rows = validate_rows(rows, body.mappings)

    matched = sum(1 for r in rows if r.get("match_status") == "matched")
    unmatched = sum(1 for r in rows if r.get("match_status") == "unmatched")
    flagged = sum(1 for r in rows if r.get("match_status") == "flagged")

    # Update batch status + counts
    batch.status = "validated"
    batch.matched_count = matched
    batch.unmatched_count = unmatched
    batch.flagged_count = flagged
    batch.updated_at = datetime.now(UTC)

    if body.save_for_client:
        existing_result = await db.execute(
            select(ClientColumnMapping).where(ClientColumnMapping.client_id == batch.client_id)
        )
        existing_map = {m.internal_field: m for m in existing_result.scalars().all()}
        for header, field in body.mappings.items():
            if field in existing_map:
                existing_map[field].spreadsheet_header = header
            else:
                db.add(ClientColumnMapping(
                    client_id=batch.client_id,
                    spreadsheet_header=header,
                    internal_field=field,
                ))

    await db.commit()

    preview_rows = [
        PreviewRow(
            row_index=i,
            raw_data={k: str(v) if v is not None else None for k, v in row.items()
                      if not k.startswith("_") and k not in ("matched_worker_id", "match_method", "match_status", "validation_errors")},
            matched_worker_id=row.get("matched_worker_id"),
            match_method=row.get("match_method"),
            match_status=row.get("match_status", "unmatched"),
            validation_errors=row.get("validation_errors", []),
            work_date=row.get("_parsed_date"),
            hours_worked=row.get("_parsed_hours"),
            overtime_hours=row.get("_parsed_overtime"),
        )
        for i, row in enumerate(rows)
    ]

    return PreviewResponse(
        batch_id=batch_id,
        rows=preview_rows,
        matched_count=matched,
        unmatched_count=unmatched,
        flagged_count=flagged,
    )


# ── Commit ─────────────────────────────────────────────────────────────────────

@batches_router.post("/{batch_id}/commit", response_model=CommitResponse)
async def commit_batch(
    batch_id: UUID,
    body: ApplyMappingsRequest,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CommitResponse:
    """Commit validated rows to worker_hours. Matched rows are imported; unmatched are stored too."""
    batch_result = await db.execute(
        select(HoursImportBatch).where(HoursImportBatch.id == batch_id)
    )
    batch = batch_result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status == "imported":
        raise HTTPException(status_code=400, detail="Batch already imported")

    # Re-parse and re-validate
    try:
        url = await b2.generate_presigned_download_url(batch.storage_key)
        import urllib.request
        with urllib.request.urlopen(url, timeout=30) as resp:
            file_bytes = resp.read()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not retrieve file: {exc}") from exc

    rows = parse_spreadsheet(file_bytes, batch.content_type)

    workers_result = await db.execute(select(Worker).where(Worker.archived_at.is_(None)))
    all_workers = workers_result.scalars().all()
    worker_lookup: dict = {"by_pesel": {}, "by_name": {}}
    for w in all_workers:
        if w.pesel:
            worker_lookup["by_pesel"][w.pesel] = str(w.id)
        worker_lookup["by_name"][f"{w.first_name} {w.last_name}".lower()] = str(w.id)

    rows = match_workers(rows, body.mappings, worker_lookup)
    rows = validate_rows(rows, body.mappings)

    # Get worker_name header for raw_worker_name
    field_to_headers: dict[str, list[str]] = {}
    for header, field in body.mappings.items():
        field_to_headers.setdefault(field, []).append(header)

    def get_cell(row: dict, field: str) -> str | None:
        for h in field_to_headers.get(field, []):
            v = row.get(h)
            if v is not None:
                return str(v).strip()
        return None

    imported_count = 0
    skipped_count = 0
    for i, row in enumerate(rows):
        worker_id_str = row.get("matched_worker_id")
        worker_id = UUID(worker_id_str) if worker_id_str else None
        match_status = row.get("match_status", "unmatched")

        wh = WorkerHours(
            batch_id=batch_id,
            worker_id=worker_id,
            assignment_id=None,
            row_index=i,
            raw_worker_name=get_cell(row, "worker_name"),
            work_date=row.get("_parsed_date"),
            hours_worked=row.get("_parsed_hours"),
            overtime_hours=row.get("_parsed_overtime"),
            absence_type=get_cell(row, "absence_type"),
            notes=get_cell(row, "notes"),
            match_status=match_status,
            validation_errors=row.get("validation_errors") or None,
        )
        db.add(wh)

        if match_status == "matched":
            imported_count += 1
        else:
            skipped_count += 1

    batch.status = "imported"
    batch.updated_at = datetime.now(UTC)

    # Flush WorkerHours so invoice service can query them within this transaction
    await db.flush()

    # Auto-generate a draft invoice from committed hours
    invoice = await create_draft_from_batch(batch, db)

    await db.commit()

    return CommitResponse(
        batch_id=batch_id,
        imported_count=imported_count,
        skipped_count=skipped_count,
        invoice_id=invoice.id if invoice else None,
    )


# ── Batch status ───────────────────────────────────────────────────────────────

@batches_router.get("/{batch_id}", response_model=HoursImportBatchRead)
async def get_batch(
    batch_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HoursImportBatchRead:
    result = await db.execute(select(HoursImportBatch).where(HoursImportBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return HoursImportBatchRead.model_validate(batch)


@batches_router.delete("/{batch_id}", status_code=204)
async def delete_batch(
    batch_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(HoursImportBatch).where(HoursImportBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    if batch.status == "imported":
        raise HTTPException(status_code=400, detail="Cannot delete an imported batch")
    try:
        await b2.delete_file(batch.storage_key)
    except Exception:
        pass  # Best-effort B2 cleanup; DB record still removed
    await db.delete(batch)
    await db.commit()


# ── Client import history ──────────────────────────────────────────────────────

@clients_router.get("/{client_id}/hours-import", response_model=PaginatedBatches)
async def list_client_batches(
    client_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedBatches:
    q = select(HoursImportBatch).where(HoursImportBatch.client_id == client_id)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    result = await db.execute(
        q.order_by(HoursImportBatch.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())
    return PaginatedBatches(
        items=[HoursImportBatchRead.model_validate(b) for b in items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── Assignment hours (for invoicing) ──────────────────────────────────────────

@assignments_hours_router.get("/{assignment_id}/hours", response_model=WorkerHoursSummary)
async def get_assignment_hours(
    assignment_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    month: str | None = Query(None, description="YYYY-MM filter"),
) -> WorkerHoursSummary:
    """Return aggregated hours for an assignment, optionally filtered by month."""
    from sqlalchemy import and_, extract
    q = select(WorkerHours).where(WorkerHours.assignment_id == assignment_id)
    if month:
        try:
            from datetime import datetime as dt
            parsed = dt.strptime(month, "%Y-%m")
            q = q.where(
                and_(
                    extract("year", WorkerHours.work_date) == parsed.year,
                    extract("month", WorkerHours.work_date) == parsed.month,
                )
            )
        except ValueError:
            raise HTTPException(status_code=422, detail="month must be YYYY-MM format")

    result = await db.execute(q)
    hours_rows = result.scalars().all()

    total_hours = sum((r.hours_worked or Decimal(0)) for r in hours_rows)
    total_overtime = sum((r.overtime_hours or Decimal(0)) for r in hours_rows)
    work_dates = sorted({r.work_date for r in hours_rows if r.work_date})
    worker_id = hours_rows[0].worker_id if hours_rows else None

    return WorkerHoursSummary(
        worker_id=worker_id,
        assignment_id=assignment_id,
        total_hours=total_hours,  # type: ignore[arg-type]
        total_overtime=total_overtime,  # type: ignore[arg-type]
        work_dates=work_dates,
    )
