"""
Document template and contract generation router.

Endpoints:
  GET  /api/v1/document-templates          — list templates
  POST /api/v1/document-templates          — create template
  GET  /api/v1/document-templates/{id}     — get template with body_html
  PATCH /api/v1/document-templates/{id}    — update template

  POST /api/v1/documents/generate          — render template → draft GeneratedDocument
  POST /api/v1/documents/{id}/finalize     — lock document, generate PDF
  GET  /api/v1/documents/{id}/pdf          — download PDF (Content-Type: application/pdf)
  GET  /api/v1/documents/{id}              — get document detail (with rendered_html)
  GET  /api/v1/workers/{worker_id}/documents — list documents for a worker

Placeholder token context:
  worker.*       — fields from workers table
  client.*       — fields from clients table (via current assignment)
  assignment.*   — fields from assignments table (if assignment_id provided)
  generated_date — ISO date of generation
  generated_by   — user who generated

Tokens use {{key}} syntax and are replaced via simple string substitution.
"""

import csv
import io
import re
from datetime import UTC, date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.assignments import Assignment
from app.models.clients import Client
from app.models.documents import DocumentTemplate, GeneratedDocument
from app.models.enums import DocumentStatus, TemplateType
from app.models.workers import Worker
from app.schemas.documents import (
    DocumentTemplateCreate,
    DocumentTemplateDetail,
    DocumentTemplateRead,
    DocumentTemplateUpdate,
    GeneratedDocumentDetail,
    GeneratedDocumentRead,
    GenerateDocumentRequest,
    LegalizationStatusUpdate,
    PaginatedDocuments,
    PaginatedTemplates,
)

templates_router = APIRouter(prefix="/api/v1/document-templates", tags=["documents"])
documents_router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
worker_docs_router = APIRouter(prefix="/api/v1/workers", tags=["documents"])


# ── Template token rendering ───────────────────────────────────────────────────

def _build_context(
    worker: Worker,
    client: Client | None,
    assignment: Assignment | None,
    overrides: dict[str, str] | None,
) -> dict[str, str]:
    """Build flat token→value map from related entities."""

    def _fmt_date(val: object) -> str:
        if val is None:
            return "—"
        if hasattr(val, "strftime"):
            return val.strftime("%d.%m.%Y")
        return str(val)

    ctx: dict[str, str] = {
        # Worker — core fields
        "worker.first_name": worker.first_name or "",
        "worker.last_name": worker.last_name or "",
        "worker.full_name": f"{worker.first_name} {worker.last_name}",
        "worker.pesel": worker.pesel or "—",
        "worker.address": worker.address or "—",
        "worker.nationality": worker.nationality or "—",
        "worker.phone": worker.phone or "—",
        "worker.email": worker.email or "—",
        "worker.date_of_birth": _fmt_date(worker.date_of_birth),
        "worker.passport_number": worker.passport_number or "—",
        # Worker — praca.gov fields (EUR-199)
        "worker.gender": getattr(worker, "gender", None) or "—",
        "worker.citizenship": getattr(worker, "citizenship", None) or "—",
        "worker.travel_document_type": getattr(worker, "travel_document_type", None) or "—",
        "worker.travel_document_series": getattr(worker, "travel_document_series", None) or "—",
        "worker.travel_document_number": getattr(worker, "travel_document_number", None) or "—",
        "worker.travel_document_issue_date": _fmt_date(getattr(worker, "travel_document_issue_date", None)),
        "worker.travel_document_expiry": _fmt_date(getattr(worker, "travel_document_expiry", None)),
        # Client
        "client.company_name": client.company_name if client else "—",
        "client.nip": (client.nip if client else None) or "—",
        "client.address": (client.address if client else None) or "—",
        "client.city": (client.city if client else None) or "—",
        "client.country": (client.country if client else None) or "—",
        # Assignment
        "assignment.start_date": _fmt_date(assignment.start_date if assignment else None),
        "assignment.end_date": _fmt_date(assignment.end_date if assignment else None),
        "assignment.position": (assignment.position if assignment else None) or "—",
        "assignment.hourly_rate": (
            str(assignment.employer_rate) if assignment and assignment.employer_rate else "—"
        ),
        # Meta
        "generated_date": date.today().strftime("%d.%m.%Y"),
    }

    if overrides:
        ctx.update(overrides)

    return ctx


def _render(template_html: str, ctx: dict[str, str]) -> str:
    """Replace all {{token}} placeholders in template_html with values from ctx."""

    def replacer(match: re.Match[str]) -> str:
        key = match.group(1).strip()
        return ctx.get(key, match.group(0))

    return re.sub(r"\{\{([^}]+)\}\}", replacer, template_html)


# ── Template endpoints ─────────────────────────────────────────────────────────

@templates_router.get("", response_model=PaginatedTemplates)
async def list_templates(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    active_only: bool = Query(False),
) -> PaginatedTemplates:
    q = select(DocumentTemplate)
    if active_only:
        q = q.where(DocumentTemplate.is_active.is_(True))

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total: int = total_result.scalar_one()

    result = await db.execute(
        q.order_by(DocumentTemplate.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = list(result.scalars().all())
    return PaginatedTemplates(
        items=[DocumentTemplateRead.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@templates_router.get("/{template_id}", response_model=DocumentTemplateDetail)
async def get_template(
    template_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentTemplateDetail:
    result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == template_id)
    )
    tpl = result.scalar_one_or_none()
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return DocumentTemplateDetail.model_validate(tpl)


@templates_router.post("", response_model=DocumentTemplateDetail, status_code=201)
async def create_template(
    body: DocumentTemplateCreate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentTemplateDetail:
    tpl = DocumentTemplate(**body.model_dump())
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    return DocumentTemplateDetail.model_validate(tpl)


@templates_router.patch("/{template_id}", response_model=DocumentTemplateDetail)
async def update_template(
    template_id: UUID,
    body: DocumentTemplateUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentTemplateDetail:
    result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == template_id)
    )
    tpl = result.scalar_one_or_none()
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")

    updates = body.model_dump(exclude_unset=True)
    if updates:
        for field, value in updates.items():
            setattr(tpl, field, value)
        tpl.version = tpl.version + 1  # type: ignore[assignment]
        tpl.updated_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(tpl)

    return DocumentTemplateDetail.model_validate(tpl)


# ── Document generation endpoints ──────────────────────────────────────────────

@documents_router.post("/generate", response_model=GeneratedDocumentDetail, status_code=201)
async def generate_document(
    body: GenerateDocumentRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GeneratedDocumentDetail:
    """Render a template with worker/assignment data and save as a draft."""

    # Load template
    tpl_result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == body.template_id)
    )
    tpl = tpl_result.scalar_one_or_none()
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")

    # Load worker
    worker_result = await db.execute(
        select(Worker).where(Worker.id == body.worker_id)
    )
    worker = worker_result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Optionally load assignment
    assignment: Assignment | None = None
    if body.assignment_id:
        asgn_result = await db.execute(
            select(Assignment).where(Assignment.id == body.assignment_id)
        )
        assignment = asgn_result.scalar_one_or_none()
        if assignment is None:
            raise HTTPException(status_code=404, detail="Assignment not found")

    # Optionally load current client
    client: Client | None = None
    client_id = (
        assignment.client_id if assignment and hasattr(assignment, "client_id") else worker.current_client_id
    )
    if client_id:
        client_result = await db.execute(select(Client).where(Client.id == client_id))
        client = client_result.scalar_one_or_none()

    ctx = _build_context(worker, client, assignment, body.overrides)
    rendered_html = _render(tpl.body_html, ctx)

    username: str | None = None
    if hasattr(current_user, "email"):
        username = current_user.email
    elif hasattr(current_user, "username"):
        username = current_user.username

    doc = GeneratedDocument(
        template_id=tpl.id,
        worker_id=worker.id,
        assignment_id=body.assignment_id,
        rendered_html=rendered_html,
        status=DocumentStatus.draft,
        generated_by_user=username,
        template_name_snapshot=tpl.name,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return GeneratedDocumentDetail.model_validate(doc)


@documents_router.get("/{document_id}", response_model=GeneratedDocumentDetail)
async def get_document(
    document_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GeneratedDocumentDetail:
    result = await db.execute(
        select(GeneratedDocument).where(GeneratedDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return GeneratedDocumentDetail.model_validate(doc)


@documents_router.post("/{document_id}/finalize", response_model=GeneratedDocumentRead)
async def finalize_document(
    document_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GeneratedDocumentRead:
    """Lock document and generate PDF via WeasyPrint."""
    result = await db.execute(
        select(GeneratedDocument).where(GeneratedDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status in (DocumentStatus.final, DocumentStatus.signed):
        return GeneratedDocumentRead.model_validate(doc)

    try:
        from weasyprint import HTML  # type: ignore[import-untyped]

        pdf_bytes: bytes = HTML(string=doc.rendered_html).write_pdf()
        doc.pdf_data = pdf_bytes
    except ImportError:
        # WeasyPrint not installed — finalize without PDF; PDF download will 503.
        doc.pdf_data = None

    doc.status = DocumentStatus.final  # type: ignore[assignment]
    await db.commit()
    await db.refresh(doc)
    return GeneratedDocumentRead.model_validate(doc)


@documents_router.get("/{document_id}/pdf")
async def download_pdf(
    document_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Download the finalized PDF for a document."""
    result = await db.execute(
        select(GeneratedDocument).where(GeneratedDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status == DocumentStatus.draft:
        raise HTTPException(status_code=400, detail="Document must be finalized before downloading PDF")
    if not doc.pdf_data:
        raise HTTPException(
            status_code=503, detail="PDF generation unavailable — WeasyPrint not installed"
        )

    filename = f"document_{document_id}.pdf"
    return Response(
        content=doc.pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Legalization status ────────────────────────────────────────────────────────

_LEGALIZATION_TYPES = {
    TemplateType.oswiadczenie,
    TemplateType.permit_a,
    TemplateType.permit_b,
    TemplateType.permit_seasonal,
    TemplateType.residence_prep,
}

_VALID_LEGALIZATION_STATUSES = {"filed", "pending", "approved", "rejected", "expired"}


@documents_router.patch("/{document_id}/legalization-status", response_model=GeneratedDocumentRead)
async def update_legalization_status(
    document_id: UUID,
    body: LegalizationStatusUpdate,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GeneratedDocumentRead:
    """Update the legalization filing status for a legalization-type document."""
    if body.legalization_status not in _VALID_LEGALIZATION_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"legalization_status must be one of: {sorted(_VALID_LEGALIZATION_STATUSES)}",
        )

    result = await db.execute(
        select(GeneratedDocument).where(GeneratedDocument.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Fetch template to verify it's a legalization type
    tpl_result = await db.execute(
        select(DocumentTemplate).where(DocumentTemplate.id == doc.template_id)
    )
    tpl = tpl_result.scalar_one_or_none()
    if tpl is None or tpl.template_type not in _LEGALIZATION_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Legalization status can only be set on legalization-type documents",
        )

    doc.legalization_status = body.legalization_status  # type: ignore[assignment]
    doc.legalization_filed_at = body.legalization_filed_at  # type: ignore[assignment]
    doc.legalization_approved_at = body.legalization_approved_at  # type: ignore[assignment]
    doc.legalization_expires_at = body.legalization_expires_at  # type: ignore[assignment]
    doc.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(doc)
    return GeneratedDocumentRead.model_validate(doc)


# ── Worker documents list ──────────────────────────────────────────────────────

@worker_docs_router.get("/{worker_id}/documents", response_model=PaginatedDocuments)
async def list_worker_documents(
    worker_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedDocuments:
    q = select(GeneratedDocument).where(GeneratedDocument.worker_id == worker_id)

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total: int = total_result.scalar_one()

    result = await db.execute(
        q.order_by(GeneratedDocument.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())
    return PaginatedDocuments(
        items=[GeneratedDocumentRead.model_validate(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@worker_docs_router.get("/{worker_id}/legalizations", response_model=PaginatedDocuments)
async def list_worker_legalizations(
    worker_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedDocuments:
    """List only legalization documents for a worker (filtered by template type)."""
    legalization_type_values = [t.value for t in _LEGALIZATION_TYPES]
    q = (
        select(GeneratedDocument)
        .join(DocumentTemplate, GeneratedDocument.template_id == DocumentTemplate.id)
        .where(
            GeneratedDocument.worker_id == worker_id,
            DocumentTemplate.template_type.in_(legalization_type_values),
        )
    )

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total: int = total_result.scalar_one()

    result = await db.execute(
        q.order_by(GeneratedDocument.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())
    return PaginatedDocuments(
        items=[GeneratedDocumentRead.model_validate(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@worker_docs_router.get("/{worker_id}/legalizations/praca-gov-export")
async def praca_gov_export(
    worker_id: UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    """Export worker data as a CSV file matching praca.gov required fields."""
    worker_result = await db.execute(select(Worker).where(Worker.id == worker_id))
    worker = worker_result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Resolve current client/assignment for employer info
    client: Client | None = None
    if worker.current_client_id:
        c_result = await db.execute(select(Client).where(Client.id == worker.current_client_id))
        client = c_result.scalar_one_or_none()

    def _fmt(val: object) -> str:
        if val is None:
            return ""
        if hasattr(val, "strftime"):
            return val.strftime("%d.%m.%Y")
        return str(val)

    row = {
        "first_name": worker.first_name or "",
        "last_name": worker.last_name or "",
        "date_of_birth": _fmt(worker.date_of_birth),
        "citizenship": getattr(worker, "citizenship", None) or "",
        "gender": getattr(worker, "gender", None) or "",
        "travel_document_type": getattr(worker, "travel_document_type", None) or "",
        "travel_document_series": getattr(worker, "travel_document_series", None) or "",
        "travel_document_number": getattr(worker, "travel_document_number", None) or "",
        "travel_document_issue_date": _fmt(getattr(worker, "travel_document_issue_date", None)),
        "travel_document_expiry": _fmt(getattr(worker, "travel_document_expiry", None)),
        "address": worker.address or "",
        "employer_nip": (client.nip if client else "") or "",
        "employer_name": (client.company_name if client else "") or "",
        "assignment_start_date": _fmt(worker.assignment_start_date),
        "assignment_end_date": _fmt(worker.assignment_end_date),
    }

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(row.keys()))
    writer.writeheader()
    writer.writerow(row)
    output.seek(0)

    filename = f"praca_gov_{worker_id}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
