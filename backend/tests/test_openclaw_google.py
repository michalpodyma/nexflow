"""
Tests for OpenClaw Google Workspace endpoints and the google_workspace service.

Service tests: httpx is mocked via unittest.mock to simulate Google API responses
without real network calls.

Router tests: service functions are patched out so the route layer is exercised
independently of the Google APIs.
"""

from __future__ import annotations

import base64
import time
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.config import settings
from app.main import app
from app.services.google_workspace import (
    GoogleWorkspaceError,
    _cache,
    _get_access_token,
    calendar_create_event,
    calendar_list_events,
    drive_upload_file,
    gmail_label_message,
    gmail_list_messages,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

OPENCLAW_KEY = "test-openclaw-key"
_AUTH = {"Authorization": f"Bearer {OPENCLAW_KEY}"}

_GOOGLE_CREDS = {
    "google_oauth_client_id": "fake-client-id",
    "google_oauth_client_secret": "fake-client-secret",
    "google_refresh_token": "fake-refresh-token",
}


def _make_httpx_response(status: int, body: dict) -> MagicMock:
    mock = MagicMock(spec=Response)
    mock.status_code = status
    mock.json.return_value = body
    return mock


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def patch_settings():
    """Inject Google credentials and OpenClaw key into settings for all tests."""
    with (
        patch.object(settings, "openclaw_api_key", OPENCLAW_KEY),
        patch.object(settings, "google_oauth_client_id", _GOOGLE_CREDS["google_oauth_client_id"]),
        patch.object(settings, "google_oauth_client_secret", _GOOGLE_CREDS["google_oauth_client_secret"]),
        patch.object(settings, "google_refresh_token", _GOOGLE_CREDS["google_refresh_token"]),
    ):
        yield


@pytest.fixture(autouse=True)
def reset_token_cache():
    """Clear the in-process token cache between tests."""
    _cache.access_token = ""
    _cache.expires_at = 0.0
    yield
    _cache.access_token = ""
    _cache.expires_at = 0.0


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Unit tests: _get_access_token
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_access_token_fetches_fresh_token():
    token_resp = _make_httpx_response(200, {"access_token": "tok-abc", "expires_in": 3600})
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=token_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client):
        token = await _get_access_token()

    assert token == "tok-abc"
    assert _cache.access_token == "tok-abc"


@pytest.mark.asyncio
async def test_get_access_token_uses_cache():
    _cache.access_token = "cached-token"
    _cache.expires_at = time.monotonic() + 600  # well in future

    with patch("app.services.google_workspace.httpx.AsyncClient") as mock_cls:
        token = await _get_access_token()

    mock_cls.assert_not_called()
    assert token == "cached-token"


@pytest.mark.asyncio
async def test_get_access_token_refreshes_near_expiry():
    _cache.access_token = "old-token"
    _cache.expires_at = time.monotonic() + 30  # within 60s margin → must refresh

    token_resp = _make_httpx_response(200, {"access_token": "new-token", "expires_in": 3600})
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=token_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client):
        token = await _get_access_token()

    assert token == "new-token"


@pytest.mark.asyncio
async def test_get_access_token_raises_on_error():
    err_resp = _make_httpx_response(401, {"error": "invalid_client"})
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=err_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(GoogleWorkspaceError, match="Token refresh failed"):
            await _get_access_token()


# ---------------------------------------------------------------------------
# Unit tests: gmail_list_messages
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gmail_list_messages_returns_messages():
    list_resp = _make_httpx_response(200, {"messages": [{"id": "msg1"}]})
    detail_resp = _make_httpx_response(
        200,
        {
            "id": "msg1",
            "threadId": "t1",
            "labelIds": ["INBOX"],
            "snippet": "Hello",
            "internalDate": "1714391000000",
            "payload": {"headers": [{"name": "Subject", "value": "Test"}]},
        },
    )

    call_count = 0

    async def fake_get(url, **kwargs):
        nonlocal call_count
        call_count += 1
        if "messages?maxResults" in url or "/messages" == url.split("?")[0].split("/")[-1]:
            if call_count == 1:
                return list_resp
        return detail_resp

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[list_resp, detail_resp])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.google_workspace._get_access_token", return_value="tok"),
        patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client),
    ):
        results = await gmail_list_messages(label="INBOX", max_results=10)

    assert len(results) == 1
    assert results[0]["id"] == "msg1"


@pytest.mark.asyncio
async def test_gmail_list_messages_not_configured():
    with patch.object(settings, "google_refresh_token", ""):
        with pytest.raises(GoogleWorkspaceError, match="not configured"):
            await gmail_list_messages()


# ---------------------------------------------------------------------------
# Unit tests: gmail_label_message
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gmail_label_message_success():
    label_resp = _make_httpx_response(200, {"id": "msg1", "labelIds": ["INBOX", "Label_42"]})
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=label_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.google_workspace._get_access_token", return_value="tok"),
        patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client),
    ):
        result = await gmail_label_message("msg1", ["Label_42"])

    assert result["id"] == "msg1"
    assert "Label_42" in result["labelIds"]


# ---------------------------------------------------------------------------
# Unit tests: calendar_list_events
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_calendar_list_events_returns_items():
    events_resp = _make_httpx_response(
        200,
        {
            "items": [
                {
                    "id": "evt1",
                    "summary": "Standup",
                    "description": "",
                    "start": {"dateTime": "2026-04-29T09:00:00Z"},
                    "end": {"dateTime": "2026-04-29T09:30:00Z"},
                    "htmlLink": "https://calendar.google.com/event?eid=evt1",
                    "organizer": {"email": "board@nexflow.work"},
                }
            ]
        },
    )
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=events_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.google_workspace._get_access_token", return_value="tok"),
        patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client),
    ):
        items = await calendar_list_events(
            calendar_id="board@nexflow.work",
            time_min=datetime(2026, 4, 29, tzinfo=UTC),
            time_max=datetime(2026, 4, 30, tzinfo=UTC),
        )

    assert len(items) == 1
    assert items[0]["summary"] == "Standup"


# ---------------------------------------------------------------------------
# Unit tests: calendar_create_event
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_calendar_create_event_success():
    create_resp = _make_httpx_response(
        201,
        {
            "id": "new-evt",
            "summary": "Kick-off",
            "start": {"dateTime": "2026-04-30T10:00:00Z"},
            "end": {"dateTime": "2026-04-30T11:00:00Z"},
            "htmlLink": "https://calendar.google.com/event?eid=new-evt",
        },
    )
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=create_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.google_workspace._get_access_token", return_value="tok"),
        patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client),
    ):
        result = await calendar_create_event(
            calendar_id="board@nexflow.work",
            summary="Kick-off",
            start=datetime(2026, 4, 30, 10, 0, tzinfo=UTC),
            end=datetime(2026, 4, 30, 11, 0, tzinfo=UTC),
        )

    assert result["id"] == "new-evt"


# ---------------------------------------------------------------------------
# Unit tests: drive_upload_file
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_drive_upload_file_success():
    upload_resp = _make_httpx_response(
        200,
        {
            "id": "file-abc",
            "name": "briefing.pdf",
            "webViewLink": "https://drive.google.com/file/d/file-abc",
            "mimeType": "application/pdf",
            "size": "12345",
        },
    )
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=upload_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.services.google_workspace._get_access_token", return_value="tok"),
        patch("app.services.google_workspace.httpx.AsyncClient", return_value=mock_client),
    ):
        result = await drive_upload_file(
            name="briefing.pdf",
            content=b"%PDF-1.4 test content",
            mime_type="application/pdf",
        )

    assert result["id"] == "file-abc"
    assert result["name"] == "briefing.pdf"


# ---------------------------------------------------------------------------
# Router integration tests (service functions patched)
# ---------------------------------------------------------------------------

_SAMPLE_GMAIL_MSG = {
    "id": "msg1",
    "threadId": "t1",
    "labelIds": ["INBOX"],
    "snippet": "Hello from the inbox",
    "internalDate": "1714391000000",
    "payload": {
        "headers": [
            {"name": "From", "value": "sender@example.com"},
            {"name": "Subject", "value": "Hello"},
        ]
    },
}


@pytest.mark.asyncio
async def test_endpoint_list_gmail_messages(client: AsyncClient):
    with patch(
        "app.routers.openclaw.gmail_list_messages",
        new=AsyncMock(return_value=[_SAMPLE_GMAIL_MSG]),
    ):
        resp = await client.get("/api/openclaw/gmail/messages", headers=_AUTH)

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["id"] == "msg1"
    assert data[0]["snippet"] == "Hello from the inbox"


@pytest.mark.asyncio
async def test_endpoint_list_gmail_messages_requires_auth(client: AsyncClient):
    resp = await client.get("/api/openclaw/gmail/messages")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_endpoint_label_gmail_message(client: AsyncClient):
    with patch(
        "app.routers.openclaw.gmail_label_message",
        new=AsyncMock(return_value={"id": "msg1", "labelIds": ["INBOX", "Label_42"]}),
    ):
        resp = await client.post(
            "/api/openclaw/gmail/messages/msg1/label",
            json={"add_label_ids": ["Label_42"]},
            headers=_AUTH,
        )

    assert resp.status_code == 200
    assert resp.json()["id"] == "msg1"


@pytest.mark.asyncio
async def test_endpoint_label_rejects_trash(client: AsyncClient):
    resp = await client.post(
        "/api/openclaw/gmail/messages/msg1/label",
        json={"add_label_ids": ["TRASH"]},
        headers=_AUTH,
    )
    assert resp.status_code == 400
    assert "TRASH" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_endpoint_label_rejects_spam(client: AsyncClient):
    resp = await client.post(
        "/api/openclaw/gmail/messages/msg1/label",
        json={"add_label_ids": ["SPAM"]},
        headers=_AUTH,
    )
    assert resp.status_code == 400


_SAMPLE_EVENTS = [
    {
        "id": "evt1",
        "summary": "Standup",
        "description": "",
        "start": {"dateTime": "2026-04-29T09:00:00Z"},
        "end": {"dateTime": "2026-04-29T09:30:00Z"},
        "htmlLink": "https://cal.google.com",
        "organizer": {"email": "board@nexflow.work"},
    }
]


@pytest.mark.asyncio
async def test_endpoint_list_calendar_events(client: AsyncClient):
    with patch(
        "app.routers.openclaw.calendar_list_events",
        new=AsyncMock(return_value=_SAMPLE_EVENTS),
    ):
        resp = await client.get(
            "/api/openclaw/calendar/events",
            params={
                "calendar_id": "board@nexflow.work",
                "date_min": "2026-04-29T00:00:00Z",
                "date_max": "2026-04-30T00:00:00Z",
            },
            headers=_AUTH,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["summary"] == "Standup"


@pytest.mark.asyncio
async def test_endpoint_create_calendar_event(client: AsyncClient):
    with patch(
        "app.routers.openclaw.calendar_create_event",
        new=AsyncMock(
            return_value={
                "id": "new-evt",
                "summary": "Kick-off",
                "start": {"dateTime": "2026-04-30T10:00:00Z"},
                "end": {"dateTime": "2026-04-30T11:00:00Z"},
                "htmlLink": "https://cal.google.com",
            }
        ),
    ):
        resp = await client.post(
            "/api/openclaw/calendar/events",
            json={
                "calendar_id": "board@nexflow.work",
                "summary": "Kick-off",
                "start": "2026-04-30T10:00:00Z",
                "end": "2026-04-30T11:00:00Z",
            },
            headers=_AUTH,
        )

    assert resp.status_code == 200
    assert resp.json()["id"] == "new-evt"


@pytest.mark.asyncio
async def test_endpoint_drive_upload(client: AsyncClient):
    content_b64 = base64.b64encode(b"PDF content here").decode()
    with patch(
        "app.routers.openclaw.drive_upload_file",
        new=AsyncMock(
            return_value={
                "id": "file-abc",
                "name": "sop.pdf",
                "webViewLink": "https://drive.google.com/file/d/file-abc",
                "mimeType": "application/pdf",
                "size": "16",
            }
        ),
    ):
        resp = await client.post(
            "/api/openclaw/drive/files",
            json={
                "name": "sop.pdf",
                "content_base64": content_b64,
                "mime_type": "application/pdf",
            },
            headers=_AUTH,
        )

    assert resp.status_code == 200
    assert resp.json()["id"] == "file-abc"


@pytest.mark.asyncio
async def test_endpoint_drive_upload_rejects_invalid_base64(client: AsyncClient):
    resp = await client.post(
        "/api/openclaw/drive/files",
        json={
            "name": "sop.pdf",
            "content_base64": "!!NOT VALID BASE64!!",
            "mime_type": "application/pdf",
        },
        headers=_AUTH,
    )
    assert resp.status_code == 400
    assert "base64" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_endpoint_google_workspace_503_when_not_configured(client: AsyncClient):
    with patch(
        "app.routers.openclaw.gmail_list_messages",
        new=AsyncMock(side_effect=GoogleWorkspaceError("Google Workspace credentials not configured")),
    ):
        resp = await client.get("/api/openclaw/gmail/messages", headers=_AUTH)

    assert resp.status_code == 503
