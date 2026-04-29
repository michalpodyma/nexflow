"""
Google Workspace client — delegated OAuth on the board user's account.

Day-one scopes (and only these):
  gmail.modify   — list + label messages; NOT send, NOT delete
  calendar       — read + create events on pinned calendars only
  drive.file     — upload files the agent creates; NOT full drive access

Token strategy: exchange the long-lived refresh token for a short-lived
access token on first use, cache it in-process, and refresh when it
expires (<60 s margin).  No database writes; the refresh token itself
lives only in settings / Paperclip secrets.
"""

from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"
_DRIVE_BASE = "https://www.googleapis.com/drive/v3"
_DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3"

# Refresh the access token when fewer than this many seconds remain.
_EXPIRY_MARGIN_S = 60


@dataclass
class _TokenCache:
    access_token: str = ""
    expires_at: float = 0.0  # unix timestamp


_cache: _TokenCache = field(default_factory=_TokenCache)  # module-level singleton
_cache = _TokenCache()


def _is_configured() -> bool:
    return bool(
        settings.google_oauth_client_id
        and settings.google_oauth_client_secret
        and settings.google_refresh_token
    )


async def _get_access_token() -> str:
    """Return a valid access token, refreshing if necessary."""
    now = time.monotonic()
    if _cache.access_token and _cache.expires_at - now > _EXPIRY_MARGIN_S:
        return _cache.access_token

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            _TOKEN_URL,
            data={
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "refresh_token": settings.google_refresh_token,
                "grant_type": "refresh_token",
            },
        )

    if resp.status_code != 200:
        logger.error("Google token refresh failed: %s", resp.status_code)
        raise GoogleWorkspaceError(f"Token refresh failed: HTTP {resp.status_code}")

    body = resp.json()
    _cache.access_token = body["access_token"]
    _cache.expires_at = time.monotonic() + body.get("expires_in", 3600)
    return _cache.access_token


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class GoogleWorkspaceError(Exception):
    """Raised when a Google API call fails."""


# ---------------------------------------------------------------------------
# Gmail
# ---------------------------------------------------------------------------


async def gmail_list_messages(
    label: str | None = None,
    since: datetime | None = None,
    max_results: int = 50,
) -> list[dict[str, Any]]:
    """
    Return Gmail message summaries (id + snippet + labelIds + internalDate).

    ``label`` is a Gmail label name or id (e.g. "INBOX", "UNREAD").
    ``since`` is an inclusive lower bound on message date (UTC).
    Returns at most ``max_results`` messages (capped at 200).
    """
    if not _is_configured():
        raise GoogleWorkspaceError("Google Workspace credentials not configured")

    token = await _get_access_token()
    params: dict[str, Any] = {"maxResults": min(max_results, 200)}
    q_parts: list[str] = []
    if label:
        params["labelIds"] = label
    if since:
        ts = int(since.timestamp())
        q_parts.append(f"after:{ts}")
    if q_parts:
        params["q"] = " ".join(q_parts)

    async with httpx.AsyncClient(timeout=30) as client:
        list_resp = await client.get(
            f"{_GMAIL_BASE}/messages",
            headers=_auth_headers(token),
            params=params,
        )

    if list_resp.status_code != 200:
        raise GoogleWorkspaceError(f"gmail.list failed: HTTP {list_resp.status_code}")

    message_stubs = list_resp.json().get("messages", [])

    # Fetch snippet + metadata for each stub (parallel).
    async with httpx.AsyncClient(timeout=30) as client:
        results: list[dict[str, Any]] = []
        for stub in message_stubs:
            detail_resp = await client.get(
                f"{_GMAIL_BASE}/messages/{stub['id']}",
                headers=_auth_headers(token),
                params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
            )
            if detail_resp.status_code == 200:
                results.append(detail_resp.json())
            else:
                logger.warning("Could not fetch Gmail message %s: %s", stub["id"], detail_resp.status_code)

    return results


async def gmail_label_message(message_id: str, add_label_ids: list[str]) -> dict[str, Any]:
    """
    Apply label(s) to a Gmail message.  Does NOT remove any labels.

    ``add_label_ids`` must be Gmail label ids (e.g. "Label_123"), not names.
    Raises GoogleWorkspaceError on failure.
    """
    if not _is_configured():
        raise GoogleWorkspaceError("Google Workspace credentials not configured")

    token = await _get_access_token()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{_GMAIL_BASE}/messages/{message_id}/modify",
            headers=_auth_headers(token),
            json={"addLabelIds": add_label_ids, "removeLabelIds": []},
        )

    if resp.status_code != 200:
        raise GoogleWorkspaceError(
            f"gmail.modify failed for message {message_id}: HTTP {resp.status_code}"
        )
    return resp.json()


# ---------------------------------------------------------------------------
# Calendar
# ---------------------------------------------------------------------------


async def calendar_list_events(
    calendar_id: str,
    time_min: datetime,
    time_max: datetime,
    max_results: int = 100,
) -> list[dict[str, Any]]:
    """
    List calendar events in the given time window.

    ``calendar_id`` should be the board user's primary calendar id or the
    leadership shared calendar id — never "primary" shorthand for safety.
    """
    if not _is_configured():
        raise GoogleWorkspaceError("Google Workspace credentials not configured")

    token = await _get_access_token()

    def _iso(dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{_CALENDAR_BASE}/calendars/{calendar_id}/events",
            headers=_auth_headers(token),
            params={
                "timeMin": _iso(time_min),
                "timeMax": _iso(time_max),
                "maxResults": min(max_results, 500),
                "singleEvents": "true",
                "orderBy": "startTime",
            },
        )

    if resp.status_code != 200:
        raise GoogleWorkspaceError(
            f"calendar.list failed for {calendar_id}: HTTP {resp.status_code}"
        )
    return resp.json().get("items", [])


async def calendar_create_event(
    calendar_id: str,
    summary: str,
    start: datetime,
    end: datetime,
    description: str = "",
    attendees: list[str] | None = None,
) -> dict[str, Any]:
    """
    Create a calendar event.  Only allowed on pinned calendar ids — the caller
    is responsible for enforcing that constraint before calling this function.
    """
    if not _is_configured():
        raise GoogleWorkspaceError("Google Workspace credentials not configured")

    token = await _get_access_token()

    def _event_dt(dt: datetime) -> dict[str, str]:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return {"dateTime": dt.isoformat(), "timeZone": "UTC"}

    body: dict[str, Any] = {
        "summary": summary,
        "description": description,
        "start": _event_dt(start),
        "end": _event_dt(end),
    }
    if attendees:
        body["attendees"] = [{"email": e} for e in attendees]

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{_CALENDAR_BASE}/calendars/{calendar_id}/events",
            headers=_auth_headers(token),
            json=body,
        )

    if resp.status_code not in (200, 201):
        raise GoogleWorkspaceError(
            f"calendar.create failed for {calendar_id}: HTTP {resp.status_code}"
        )
    return resp.json()


# ---------------------------------------------------------------------------
# Drive
# ---------------------------------------------------------------------------


async def drive_upload_file(
    name: str,
    content: bytes,
    mime_type: str = "application/octet-stream",
    parent_folder_id: str | None = None,
) -> dict[str, Any]:
    """
    Upload a file to Drive using the multipart upload endpoint.

    Uses ``drive.file`` scope — the file is owned by the board user's
    account and is only accessible to who is explicitly granted access.
    ``parent_folder_id`` should be a Drive folder id when provided; if
    omitted, the file lands in the board user's root Drive.
    """
    if not _is_configured():
        raise GoogleWorkspaceError("Google Workspace credentials not configured")

    token = await _get_access_token()

    metadata: dict[str, Any] = {"name": name, "mimeType": mime_type}
    if parent_folder_id:
        metadata["parents"] = [parent_folder_id]

    # Build a multipart/related body manually to avoid needing google-api-python-client.
    boundary = "nexflow_drive_upload_boundary"
    meta_json = __import__("json").dumps(metadata).encode()
    body = (
        f"--{boundary}\r\n"
        f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
    ).encode()
    body += meta_json + b"\r\n"
    body += (
        f"--{boundary}\r\n"
        f"Content-Type: {mime_type}\r\n\r\n"
    ).encode()
    body += content + b"\r\n"
    body += f"--{boundary}--".encode()

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_DRIVE_UPLOAD_BASE}/files",
            headers={
                **_auth_headers(token),
                "Content-Type": f"multipart/related; boundary={boundary}",
            },
            params={"uploadType": "multipart", "fields": "id,name,webViewLink,mimeType,size"},
            content=body,
        )

    if resp.status_code not in (200, 201):
        raise GoogleWorkspaceError(f"drive.upload failed: HTTP {resp.status_code}")
    return resp.json()
