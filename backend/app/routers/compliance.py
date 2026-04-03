from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.workers import Worker

router = APIRouter(prefix="/api/v1/compliance", tags=["compliance"])

AlertSeverity = Literal["critical", "warning", "info"]
DocumentType = Literal["work_permit", "health_cert", "safety_cert"]

_DOCUMENT_LABELS: dict[str, str] = {
    "work_permit": "Work Permit",
    "health_cert": "Health Certificate",
    "safety_cert": "Safety Certificate (BHP)",
}


class ComplianceAlert(BaseModel):
    worker_id: str
    worker_name: str
    document_type: DocumentType
    document_label: str
    expiry_date: str  # ISO datetime
    days_remaining: int
    severity: AlertSeverity


class ComplianceAlertsResponse(BaseModel):
    alerts: list[ComplianceAlert]
    critical_count: int
    warning_count: int
    info_count: int
    total: int


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
        None, description="Filter by document_type: work_permit, health_cert, safety_cert"
    ),
) -> ComplianceAlertsResponse:
    """
    Return workers whose compliance documents expire within the next 90 days.

    Severity thresholds:
    - critical  : expiring in < 30 days
    - warning   : expiring in 30–59 days
    - info      : expiring in 60–90 days
    """
    now = datetime.now(timezone.utc)
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
                expiry = expiry.replace(tzinfo=timezone.utc)
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

    # Sort by urgency (soonest first)
    alerts.sort(key=lambda a: a.days_remaining)

    # Apply optional filters
    if severity:
        alerts = [a for a in alerts if a.severity == severity]
    if document_type:
        alerts = [a for a in alerts if a.document_type == document_type]

    critical_count = sum(1 for a in alerts if a.severity == "critical")
    warning_count = sum(1 for a in alerts if a.severity == "warning")
    info_count = sum(1 for a in alerts if a.severity == "info")

    return ComplianceAlertsResponse(
        alerts=alerts,
        critical_count=critical_count,
        warning_count=warning_count,
        info_count=info_count,
        total=len(alerts),
    )
