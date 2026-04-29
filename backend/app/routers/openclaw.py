"""
OpenClaw API — WhatsApp inbox triage + Google Workspace tools.

Endpoints
─────────
WhatsApp
  GET  /api/openclaw/whatsapp-inbox            — paginated list of inbound events
  POST /api/openclaw/whatsapp-inbox/{id}/ack   — mark an event acknowledged

Gmail  (gmail.modify scope — read + label; NOT send, NOT delete)
  GET  /api/openclaw/gmail/messages            — list messages by label / since
  POST /api/openclaw/gmail/messages/{id}/label — apply label(s) to a message

Calendar  (calendar scope — pinned calendars only)
  GET  /api/openclaw/calendar/events           — list events in a date range
  POST /api/openclaw/calendar/events           — create an event

Drive  (drive.file scope — files the agent creates only)
  POST /api/openclaw/drive/files               — upload a file (SOP / briefing archives)

Authentication
──────────────
Bearer token must equal settings.openclaw_api_key.  This key is intentionally
SEPARATE from WHATSAPP_ACCESS_TOKEN and from the Google OAuth credentials.
OpenClaw never receives raw Google credentials; it only calls these proxy endpoints.

Scope guard
───────────
The Gmail endpoints intentionally omit send/delete.  The Drive endpoint omits
share.  The Calendar endpoint omits delete.  Adding any of those verbs requires
a separate board approval (EUR-322 acceptance criteria).

PII
───
WhatsApp responses return from_phone_masked (last 4 digits only) and candidate_id.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import get_db
from app.models.whatsapp_inbox import WhatsAppInboxEvent
from app.services.google_workspace import (
    GoogleWorkspaceError,
    gmail_label_message,
    gmail_list_messages,
    calendar_create_event,
    calendar_list_events,
    drive_upload_file,
)

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


# ---------------------------------------------------------------------------
# Shared Google error handler
# ---------------------------------------------------------------------------


def _google_error(exc: GoogleWorkspaceError) -> HTTPException:
    msg = str(exc)
    if "not configured" in msg:
        return HTTPException(status_code=503, detail="Google Workspace not configured on this instance")
    return HTTPException(status_code=502, detail=f"Google API error: {msg}")


# ---------------------------------------------------------------------------
# Gmail — GET /api/openclaw/gmail/messages
# ---------------------------------------------------------------------------


class GmailMessageOut(BaseModel):
    id: str
    thread_id: str
    label_ids: list[str]
    snippet: str
    internal_date_ms: str
    headers: dict[str, str]


@router.get(
    "/gmail/messages",
    response_model=list[GmailMessageOut],
    dependencies=[Depends(_require_openclaw_key)],
    summary="List Gmail messages (read-only; no send/delete)",
)
async def list_gmail_messages(
    label: str | None = Query(None, description="Gmail label id or name, e.g. INBOX, UNREAD"),
    since: datetime | None = Query(None, description="Lower bound for message date (UTC ISO 8601)"),
    max_results: int = Query(50, ge=1, le=200),
) -> list[GmailMessageOut]:
    """
    List Gmail messages filtered by label and/or date.

    Scope: gmail.modify (read-only path here — no mutation).
    Does NOT return raw message bodies — only snippet + metadata headers.
    """
    try:
        raw = await gmail_list_messages(label=label, since=since, max_results=max_results)
    except GoogleWorkspaceError as exc:
        raise _google_error(exc)

    out: list[GmailMessageOut] = []
    for msg in raw:
        headers = {
            h["name"]: h["value"]
            for h in msg.get("payload", {}).get("headers", [])
            if h["name"] in ("From", "Subject", "Date")
        }
        out.append(
            GmailMessageOut(
                id=msg["id"],
                thread_id=msg.get("threadId", ""),
                label_ids=msg.get("labelIds", []),
                snippet=msg.get("snippet", ""),
                internal_date_ms=msg.get("internalDate", "0"),
                headers=headers,
            )
        )
    return out


# ---------------------------------------------------------------------------
# Gmail — POST /api/openclaw/gmail/messages/{message_id}/label
# ---------------------------------------------------------------------------


class LabelRequest(BaseModel):
    add_label_ids: list[str] = Field(
        ...,
        description="Gmail label ids to apply (e.g. Label_123). Must NOT include TRASH or SPAM.",
        min_length=1,
    )


class LabelResponse(BaseModel):
    id: str
    label_ids: list[str]


@router.post(
    "/gmail/messages/{message_id}/label",
    response_model=LabelResponse,
    dependencies=[Depends(_require_openclaw_key)],
    summary="Apply label(s) to a Gmail message (no send, no delete)",
)
async def label_gmail_message(
    message_id: str,
    body: LabelRequest,
) -> LabelResponse:
    """
    Apply one or more labels to a Gmail message.  Labels are additive —
    existing labels are not removed.

    Scope: gmail.modify.
    TRASH and SPAM label ids are rejected by this proxy to prevent accidental deletion.
    """
    forbidden = {"TRASH", "SPAM"}
    bad = forbidden.intersection(set(body.add_label_ids))
    if bad:
        raise HTTPException(status_code=400, detail=f"Label ids not permitted: {bad}")

    try:
        result = await gmail_label_message(message_id, body.add_label_ids)
    except GoogleWorkspaceError as exc:
        raise _google_error(exc)

    return LabelResponse(id=result["id"], label_ids=result.get("labelIds", []))


# ---------------------------------------------------------------------------
# Calendar — GET /api/openclaw/calendar/events
# ---------------------------------------------------------------------------


class CalendarEventOut(BaseModel):
    id: str
    summary: str
    description: str
    start: str
    end: str
    html_link: str
    organizer_email: str


@router.get(
    "/calendar/events",
    response_model=list[CalendarEventOut],
    dependencies=[Depends(_require_openclaw_key)],
    summary="List calendar events for a pinned calendar",
)
async def list_calendar_events(
    calendar_id: str = Query(..., description="Calendar id (board user or leadership shared)"),
    date_min: datetime = Query(..., description="Start of range (UTC ISO 8601, inclusive)"),
    date_max: datetime = Query(..., description="End of range (UTC ISO 8601, exclusive)"),
    max_results: int = Query(100, ge=1, le=500),
) -> list[CalendarEventOut]:
    """
    List events from the specified calendar in the given date range.

    Scope: calendar.
    Caller is responsible for supplying only board-user or leadership-shared calendar ids.
    """
    try:
        items = await calendar_list_events(
            calendar_id=calendar_id,
            time_min=date_min,
            time_max=date_max,
            max_results=max_results,
        )
    except GoogleWorkspaceError as exc:
        raise _google_error(exc)

    out: list[CalendarEventOut] = []
    for item in items:
        start_raw = item.get("start", {})
        end_raw = item.get("end", {})
        out.append(
            CalendarEventOut(
                id=item.get("id", ""),
                summary=item.get("summary", ""),
                description=item.get("description", ""),
                start=start_raw.get("dateTime", start_raw.get("date", "")),
                end=end_raw.get("dateTime", end_raw.get("date", "")),
                html_link=item.get("htmlLink", ""),
                organizer_email=item.get("organizer", {}).get("email", ""),
            )
        )
    return out


# ---------------------------------------------------------------------------
# Calendar — POST /api/openclaw/calendar/events
# ---------------------------------------------------------------------------


class CreateEventRequest(BaseModel):
    calendar_id: str = Field(..., description="Target calendar id (pinned calendars only)")
    summary: str = Field(..., min_length=1, max_length=500)
    start: datetime = Field(..., description="Event start (UTC ISO 8601)")
    end: datetime = Field(..., description="Event end (UTC ISO 8601)")
    description: str = Field("", max_length=5000)
    attendees: list[str] = Field(default_factory=list, description="Attendee email addresses")


class CreateEventResponse(BaseModel):
    id: str
    html_link: str
    summary: str
    start: str
    end: str


@router.post(
    "/calendar/events",
    response_model=CreateEventResponse,
    dependencies=[Depends(_require_openclaw_key)],
    summary="Create a calendar event on a pinned calendar",
)
async def create_calendar_event(body: CreateEventRequest) -> CreateEventResponse:
    """
    Create a calendar event.

    Scope: calendar.
    Only call against board-user or leadership-shared calendar ids.
    Calendar delete is intentionally not exposed (requires separate board approval).
    """
    try:
        result = await calendar_create_event(
            calendar_id=body.calendar_id,
            summary=body.summary,
            start=body.start,
            end=body.end,
            description=body.description,
            attendees=body.attendees or None,
        )
    except GoogleWorkspaceError as exc:
        raise _google_error(exc)

    start_raw = result.get("start", {})
    end_raw = result.get("end", {})
    return CreateEventResponse(
        id=result["id"],
        html_link=result.get("htmlLink", ""),
        summary=result.get("summary", ""),
        start=start_raw.get("dateTime", start_raw.get("date", "")),
        end=end_raw.get("dateTime", end_raw.get("date", "")),
    )


# ---------------------------------------------------------------------------
# Drive — POST /api/openclaw/drive/files
# ---------------------------------------------------------------------------


class DriveUploadRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Destination filename in Drive")
    content_base64: str = Field(..., description="File content encoded as base64")
    mime_type: str = Field("application/octet-stream", description="MIME type of the file")
    parent_folder_id: str | None = Field(None, description="Drive folder id (optional)")


class DriveUploadResponse(BaseModel):
    id: str
    name: str
    web_view_link: str
    mime_type: str
    size: str


@router.post(
    "/drive/files",
    response_model=DriveUploadResponse,
    dependencies=[Depends(_require_openclaw_key)],
    summary="Upload a file to Drive (SOP / briefing archives; drive.file scope only)",
)
async def upload_drive_file(body: DriveUploadRequest) -> DriveUploadResponse:
    """
    Upload a file to Drive using the board user's drive.file scope.

    Scope: drive.file — the agent can only access files it creates or is
    explicitly granted.  Full drive scope is intentionally NOT requested.
    drive.share_file is NOT exposed here (requires separate board approval).

    ``content_base64`` must be standard base64-encoded file bytes.
    """
    try:
        content = base64.b64decode(body.content_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="content_base64 is not valid base64")

    try:
        result = await drive_upload_file(
            name=body.name,
            content=content,
            mime_type=body.mime_type,
            parent_folder_id=body.parent_folder_id,
        )
    except GoogleWorkspaceError as exc:
        raise _google_error(exc)

    return DriveUploadResponse(
        id=result["id"],
        name=result.get("name", body.name),
        web_view_link=result.get("webViewLink", ""),
        mime_type=result.get("mimeType", body.mime_type),
        size=str(result.get("size", "")),
    )
