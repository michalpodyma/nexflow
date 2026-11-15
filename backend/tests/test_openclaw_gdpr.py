"""
Tests for GDPR erasure endpoints in openclaw.py (EUR-4013).

DELETE /api/openclaw/whatsapp-inbox/by-candidate/{candidate_id}
DELETE /api/openclaw/whatsapp-inbox/{event_id}
PATCH  /api/openclaw/gdpr/candidates/{candidate_id}/notes-scrub

Uses in-process mocks — no real DB or network calls.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.database import get_db
from app.main import app

GDPR_KEY = "test-gdpr-admin-key"
REGULAR_KEY = "test-openclaw-key"
_GDPR_AUTH = {"Authorization": f"Bearer {GDPR_KEY}"}
_REGULAR_AUTH = {"Authorization": f"Bearer {REGULAR_KEY}"}

CANDIDATE_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
EVENT_ID = uuid.UUID("cccccccc-0000-0000-0000-000000000003")
AUDIT_ID = uuid.UUID("dddddddd-0000-0000-0000-000000000004")
NOW = datetime(2026, 11, 15, 12, 0, 0, tzinfo=UTC)


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------


def _make_audit_row() -> MagicMock:
    audit = MagicMock()
    audit.id = AUDIT_ID
    audit.erased_at = NOW
    return audit


def _make_bulk_session(rowcount: int) -> AsyncMock:
    """Session mock for the by-candidate bulk endpoint."""
    session = AsyncMock()
    session.add = MagicMock()

    delete_result = MagicMock()
    delete_result.rowcount = rowcount
    session.execute = AsyncMock(return_value=delete_result)

    audit = _make_audit_row()

    async def _refresh(obj):
        obj.id = AUDIT_ID

    session.refresh = _refresh
    return session


def _make_single_event_session(event_exists: bool) -> AsyncMock:
    """Session mock for the single-event delete endpoint."""
    session = AsyncMock()
    session.add = MagicMock()

    if event_exists:
        event = MagicMock()
        event.id = EVENT_ID
        event.candidate_id = CANDIDATE_ID

        select_result = MagicMock()
        select_result.scalar_one_or_none.return_value = event

        delete_result = MagicMock()
        delete_result.rowcount = 1

        session.execute = AsyncMock(side_effect=[select_result, delete_result])
    else:
        select_result = MagicMock()
        select_result.scalar_one_or_none.return_value = None
        session.execute = AsyncMock(return_value=select_result)

    async def _refresh(obj):
        obj.id = AUDIT_ID

    session.refresh = _refresh
    return session


def _make_notes_scrub_session(candidate_exists: bool, notes_set: bool) -> AsyncMock:
    """Session mock for the notes-scrub endpoint."""
    session = AsyncMock()
    session.add = MagicMock()

    if candidate_exists:
        candidate = MagicMock()
        candidate.id = CANDIDATE_ID
        candidate.notes = "some notes" if notes_set else None

        select_result = MagicMock()
        select_result.scalar_one_or_none.return_value = candidate
    else:
        select_result = MagicMock()
        select_result.scalar_one_or_none.return_value = None

    session.execute = AsyncMock(return_value=select_result)

    async def _refresh(obj):
        obj.id = AUDIT_ID

    session.refresh = _refresh
    return session


# ---------------------------------------------------------------------------
# Auth guard tests (shared across all 3 endpoints)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bulk_erase_rejects_regular_key() -> None:
    """Regular openclaw key returns 401 on the GDPR endpoint."""
    with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
        with patch.object(settings, "openclaw_api_key", REGULAR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.request(
                    "DELETE",
                    f"/api/openclaw/whatsapp-inbox/by-candidate/{CANDIDATE_ID}",
                    headers=_REGULAR_AUTH,
                    json={},
                )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_bulk_erase_rejects_no_auth() -> None:
    """Missing bearer returns 4xx (FastAPI returns 403 or 401 depending on scheme)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.request(
            "DELETE",
            f"/api/openclaw/whatsapp-inbox/by-candidate/{CANDIDATE_ID}",
            json={},
        )
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# DELETE /whatsapp-inbox/by-candidate/{candidate_id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bulk_erase_returns_correct_response() -> None:
    """200 with records_deleted=3 when rows exist."""
    session = _make_bulk_session(rowcount=3)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.request(
                    "DELETE",
                    f"/api/openclaw/whatsapp-inbox/by-candidate/{CANDIDATE_ID}",
                    headers=_GDPR_AUTH,
                    json={"paperclip_issue_ref": "EUR-1958"},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 200
    body = resp.json()
    assert body["candidate_id"] == str(CANDIDATE_ID)
    assert body["records_deleted"] == 3
    assert body["audit_log_id"] == str(AUDIT_ID)


@pytest.mark.asyncio
async def test_bulk_erase_zero_rows_not_404() -> None:
    """records_deleted=0 is a valid 200 — not a 404."""
    session = _make_bulk_session(rowcount=0)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.request(
                    "DELETE",
                    f"/api/openclaw/whatsapp-inbox/by-candidate/{CANDIDATE_ID}",
                    headers=_GDPR_AUTH,
                    json={},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 200
    assert resp.json()["records_deleted"] == 0


@pytest.mark.asyncio
async def test_bulk_erase_writes_audit_log() -> None:
    """session.add() is called once (the GdprErasureLog row)."""
    session = _make_bulk_session(rowcount=2)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                await client.request(
                    "DELETE",
                    f"/api/openclaw/whatsapp-inbox/by-candidate/{CANDIDATE_ID}",
                    headers=_GDPR_AUTH,
                    json={},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    session.add.assert_called_once()


# ---------------------------------------------------------------------------
# DELETE /whatsapp-inbox/{event_id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_single_erase_returns_correct_response() -> None:
    """200 with records_deleted=1 when the event exists."""
    session = _make_single_event_session(event_exists=True)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.request(
                    "DELETE",
                    f"/api/openclaw/whatsapp-inbox/{EVENT_ID}",
                    headers=_GDPR_AUTH,
                    json={},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 200
    body = resp.json()
    assert body["records_deleted"] == 1
    assert body["candidate_id"] == str(CANDIDATE_ID)
    assert body["audit_log_id"] == str(AUDIT_ID)


@pytest.mark.asyncio
async def test_single_erase_404_when_event_missing() -> None:
    """404 when the event does not exist."""
    session = _make_single_event_session(event_exists=False)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.request(
                    "DELETE",
                    f"/api/openclaw/whatsapp-inbox/{EVENT_ID}",
                    headers=_GDPR_AUTH,
                    json={},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /gdpr/candidates/{candidate_id}/notes-scrub
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_notes_scrub_clears_notes_and_returns_scrubbed_true() -> None:
    """scrubbed=True when notes were non-null."""
    session = _make_notes_scrub_session(candidate_exists=True, notes_set=True)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.patch(
                    f"/api/openclaw/gdpr/candidates/{CANDIDATE_ID}/notes-scrub",
                    headers=_GDPR_AUTH,
                    json={"paperclip_issue_ref": "EUR-1958"},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 200
    body = resp.json()
    assert body["scrubbed"] is True
    assert body["candidate_id"] == str(CANDIDATE_ID)
    assert body["audit_log_id"] == str(AUDIT_ID)


@pytest.mark.asyncio
async def test_notes_scrub_already_null_returns_scrubbed_false() -> None:
    """scrubbed=False when notes were already null."""
    session = _make_notes_scrub_session(candidate_exists=True, notes_set=False)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.patch(
                    f"/api/openclaw/gdpr/candidates/{CANDIDATE_ID}/notes-scrub",
                    headers=_GDPR_AUTH,
                    json={},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 200
    assert resp.json()["scrubbed"] is False


@pytest.mark.asyncio
async def test_notes_scrub_404_when_candidate_missing() -> None:
    """404 when the candidate does not exist."""
    session = _make_notes_scrub_session(candidate_exists=False, notes_set=False)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.patch(
                    f"/api/openclaw/gdpr/candidates/{CANDIDATE_ID}/notes-scrub",
                    headers=_GDPR_AUTH,
                    json={},
                )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_notes_scrub_rejects_regular_key() -> None:
    """Regular openclaw key returns 401 on the notes-scrub endpoint."""
    with patch.object(settings, "openclaw_gdpr_admin_key", GDPR_KEY):
        with patch.object(settings, "openclaw_api_key", REGULAR_KEY):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                resp = await client.patch(
                    f"/api/openclaw/gdpr/candidates/{CANDIDATE_ID}/notes-scrub",
                    headers=_REGULAR_AUTH,
                    json={},
                )
    assert resp.status_code == 401
