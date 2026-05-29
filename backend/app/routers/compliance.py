from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.documents import DocumentTemplate, GeneratedDocument
from app.models.enums import TemplateType
from app.models.workers import Worker

router = APIRouter(prefix="/api/v1/compliance", tags=["compliance"])

AlertSeverity = Literal["critical", "warning", "info"]
DocumentType = Literal["work_permit", "health_cert", "safety_cert", "legalization_permit"]

_LEGALIZATION_TYPES = {
    TemplateType.oswiadczenie,
    TemplateType.permit_a,
    TemplateType.permit_b,
    TemplateType.permit_seasonal,
    TemplateType.residence_prep,
}

_DOCUMENT_LABELS: dict[str, str] = {
    "work_permit": "Work Permit",
    "health_cert": "Health Certificate",
    "safety_cert": "Safety Certificate (BHP)",
    "legalization_permit": "Legalization Permit",
}


class ComplianceAlert(BaseModel):
    worker_id: str
    worker_name: str
    document_type: DocumentType
    document_label: str
    expiry_date: str  # ISO datetime
    days_remaining: int
    severity: AlertSeverity
    document_id: str | None = None  # set for legalization_permit alerts; links to GeneratedDocument


class ComplianceAlertsResponse(BaseModel):
    alerts: list[ComplianceAlert]
    critical_count: int
    warning_count: int
    info_count: int
    total: int


_DOCUMENT_FIELD_MAP: dict[str, str] = {
    "work_permit": "work_permit_expiry",
    "health_cert": "health_cert_expiry",
    "safety_cert": "safety_cert_expiry",
}


class RenewComplianceRequest(BaseModel):
    worker_id: UUID
    document_type: DocumentType
    new_expiry_date: str  # ISO date string e.g. "2027-06-15"


class RenewComplianceResponse(BaseModel):
    worker_id: str
    document_type: DocumentType
    new_expiry_date: str


def _severity(days: int) -> AlertSeverity:
    if days < 30:
        return "critical"
    if days < 60:
        return "warning"
    return "info"


@router.get("/alerts", response_model=ComplianceAlertsResponse)
async def get_compliance_alerts(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    severity: str | None = Query(None, description="Filter by severity: critical, warning, info"),
    document_type: str | None = Query(
        None, description="Filter by document_type: work_permit, health_cert, safety_cert, legalization_permit"
    ),
) -> ComplianceAlertsResponse:
    """
    Return workers whose compliance documents expire within the next 90 days.

    Severity thresholds:
    - critical  : expiring in < 30 days
    - warning   : expiring in 30–59 days
    - info      : expiring in 60–90 days
    """
    now = datetime.now(UTC)
    cutoff = now + timedelta(days=90)

    result = await db.execute(
        select(Worker).where(
            or_(
                Worker.work_permit_expiry.between(now, cutoff),
                Worker.health_cert_expiry.between(now, cutoff),
                Worker.safety_cert_expiry.between(now, cutoff),
            )
        )
    )
    workers = list(result.scalars().all())

    _doc_fields: list[tuple[str, DocumentType]] = [
        ("work_permit_expiry", "work_permit"),
        ("health_cert_expiry", "health_cert"),
        ("safety_cert_expiry", "safety_cert"),
    ]

    alerts: list[ComplianceAlert] = []
    for worker in workers:
        for field_name, doc_type in _doc_fields:
            expiry: datetime | None = getattr(worker, field_name)
            if expiry is None:
                continue
            # Make expiry timezone-aware if needed
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=UTC)
            if expiry < now or expiry > cutoff:
                continue

            days_remaining = (expiry - now).days
            sev = _severity(days_remaining)

            alerts.append(
                ComplianceAlert(
                    worker_id=str(worker.id),
                    worker_name=f"{worker.first_name} {worker.last_name}",
                    document_type=doc_type,
                    document_label=_DOCUMENT_LABELS[doc_type],
                    expiry_date=expiry.isoformat(),
                    days_remaining=days_remaining,
                    severity=sev,
                )
            )

    # Legalization documents expiring within 90 days
    leg_type_values = [t.value for t in _LEGALIZATION_TYPES]
    leg_result = await db.execute(
        select(GeneratedDocument, Worker)
        .join(DocumentTemplate, GeneratedDocument.template_id == DocumentTemplate.id)
        .join(Worker, GeneratedDocument.worker_id == Worker.id)
        .where(
            DocumentTemplate.template_type.in_(leg_type_values),
            GeneratedDocument.legalization_expires_at.between(now, cutoff),
        )
    )
    for gen_doc, worker in leg_result.all():
        expiry = gen_doc.legalization_expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=UTC)
        days_remaining = (expiry - now).days
        sev = _severity(days_remaining)
        alerts.append(
            ComplianceAlert(
                worker_id=str(worker.id),
                worker_name=f"{worker.first_name} {worker.last_name}",
                document_type="legalization_permit",
                document_label=_DOCUMENT_LABELS["legalization_permit"],
                expiry_date=expiry.isoformat(),
                days_remaining=days_remaining,
                severity=sev,
                document_id=str(gen_doc.id),
            )
        )

    # Sort by urgency (soonest first)
    alerts.sort(key=lambda a: a.days_remaining)

    # Compute global counts before filtering so summary cards always reflect totals
    critical_count = sum(1 for a in alerts if a.severity == "critical")
    warning_count = sum(1 for a in alerts if a.severity == "warning")
    info_count = sum(1 for a in alerts if a.severity == "info")

    # Apply optional filters (table only — counts above are unaffected)
    if severity:
        alerts = [a for a in alerts if a.severity == severity]
    if document_type:
        alerts = [a for a in alerts if a.document_type == document_type]

    return ComplianceAlertsResponse(
        alerts=alerts,
        critical_count=critical_count,
        warning_count=warning_count,
        info_count=info_count,
        total=len(alerts),
    )


@router.post("/renew", response_model=RenewComplianceResponse)
async def renew_compliance_document(
    body: RenewComplianceRequest,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RenewComplianceResponse:
    """
    Update the expiry date for a worker's compliance document.

    Accepts upcoming and expired documents alike — any document that needs renewal.
    """
    result = await db.execute(select(Worker).where(Worker.id == body.worker_id))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    try:
        new_expiry = datetime.fromisoformat(body.new_expiry_date).replace(tzinfo=UTC)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format — use ISO 8601 (e.g. 2027-06-15)")

    now = datetime.now(UTC)
    if new_expiry <= now:
        raise HTTPException(status_code=422, detail="New expiry date must be in the future")

    field_name = _DOCUMENT_FIELD_MAP[body.document_type]
    setattr(worker, field_name, new_expiry)
    await db.commit()

    return RenewComplianceResponse(
        worker_id=str(worker.id),
        document_type=body.document_type,
        new_expiry_date=new_expiry.isoformat(),
    )
