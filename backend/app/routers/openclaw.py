"""
OpenClaw read-only API — WhatsApp inbox triage surface.

Endpoints
─────────
GET  /api/openclaw/whatsapp-inbox          — paginated list of inbound events
POST /api/openclaw/whatsapp-inbox/{id}/ack — mark an event acknowledged

Authentication
──────────────
Bearer token must equal settings.openclaw_api_key.  This key is intentionally
SEPARATE from WHATSAPP_ACCESS_TOKEN — OpenClaw must never receive the WhatsApp
credential.  No WHATSAPP_ACCESS_TOKEN is imported or accessible here.

PII
───
Responses return from_phone_masked (last 4 digits only) and candidate_id.
OpenClaw must link back to the Nexflow candidate record for full context.
Raw phone numbers are NOT returned.  OpenClaw must NOT paste message content
verbatim into Telegram; it must summarise and link to the Paperclip issue.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import get_db
from app.models.whatsapp_inbox import WhatsAppInboxEvent

router = APIRouter(prefix="/api/openclaw", tags=["openclaw"])
logger = logging.getLogger(__name__)
_bearer = HTTPBearer()


def _require_openclaw_key(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> None:
    key = settings.openclaw_api_key
    if not key:
        raise HTTPException(status_code=503, detail="OpenClaw API not configured on this instance")
    if credentials.credentials != key:
        raise HTTPException(status_code=401, detail="Invalid OpenClaw API key")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class InboxEventOut(BaseModel):
    id: UUID
    candidate_id: UUID | None
    from_phone_masked: str
    message_text: str
    received_at: datetime
    acknowledged_at: datetime | None
    paperclip_issue_id: str | None

    model_config = {"from_attributes": True}


class InboxListResponse(BaseModel):
    events: list[InboxEventOut]
    total: int


# ---------------------------------------------------------------------------
# GET /api/openclaw/whatsapp-inbox
# ---------------------------------------------------------------------------


@router.get(
    "/whatsapp-inbox",
    response_model=InboxListResponse,
    dependencies=[Depends(_require_openclaw_key)],
    summary="List inbound WhatsApp messages (OpenClaw triage inbox)",
)
async def list_inbox(
    since: datetime | None = Query(
        None,
        description="Return events received after this UTC timestamp (ISO 8601)",
    ),
    unacknowledged_only: bool = Query(
        False,
        description="When true, return only events not yet acknowledged by OpenClaw",
    ),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> InboxListResponse:
    """
    Return inbound WhatsApp messages for OpenClaw to triage.

    Use `since` with the last-seen timestamp to poll for new messages (e.g.
    the overnight window for the daily briefing).  Use `unacknowledged_only`
    to focus on events that haven't been noted in a briefing yet.
    """
    stmt = select(WhatsAppInboxEvent).order_by(WhatsAppInboxEvent.received_at.desc())

    if since is not None:
        # Ensure timezone-aware comparison
        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
        stmt = stmt.where(WhatsAppInboxEvent.received_at > since)

    if unacknowledged_only:
        stmt = stmt.where(WhatsAppInboxEvent.acknowledged_at.is_(None))

    count_result = await db.execute(stmt)
    all_rows = count_result.scalars().all()
    total = len(all_rows)

    events = [InboxEventOut.model_validate(row) for row in all_rows[:limit]]
    return InboxListResponse(events=events, total=total)


# ---------------------------------------------------------------------------
# POST /api/openclaw/whatsapp-inbox/{event_id}/ack
# ---------------------------------------------------------------------------


class AckRequest(BaseModel):
    paperclip_issue_id: str | None = None


@router.post(
    "/whatsapp-inbox/{event_id}/ack",
    response_model=InboxEventOut,
    dependencies=[Depends(_require_openclaw_key)],
    summary="Acknowledge a WhatsApp inbox event (mark as seen in briefing or issue)",
)
async def acknowledge_event(
    event_id: UUID,
    body: AckRequest,
    db: AsyncSession = Depends(get_db),
) -> InboxEventOut:
    """
    Mark an inbox event as acknowledged.  Optionally link the Paperclip issue
    that was created for it.  Idempotent — re-acking an already-acked event
    updates the paperclip_issue_id if provided.
    """
    result = await db.execute(
        select(WhatsAppInboxEvent).where(WhatsAppInboxEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    event.acknowledged_at = datetime.now(tz=timezone.utc)
    if body.paperclip_issue_id is not None:
        event.paperclip_issue_id = body.paperclip_issue_id

    await db.commit()
    await db.refresh(event)

    logger.info(
        "[openclaw] Event %s acknowledged; paperclip_issue_id=%s",
        event_id,
        event.paperclip_issue_id,
    )
    return InboxEventOut.model_validate(event)
