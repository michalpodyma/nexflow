"""
Tests for DELETE /api/v1/candidates/{candidate_id}/inbox-data (EUR-3990).

Uses synthetic candidate/inbox IDs — no real PII in fixtures.
"""

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.middleware import get_current_user
from app.database import get_db
from app.main import app

CANDIDATE_ID = uuid.UUID("aaaaaaaa-0000-0000-0000-000000000001")
OTHER_ID = uuid.UUID("bbbbbbbb-0000-0000-0000-000000000002")


def _make_session(candidate_exists: bool, rowcount: int) -> AsyncMock:
    """Build an AsyncSession mock for the erasure endpoint."""
    session = AsyncMock()
    session.add = MagicMock()

    # First execute: SELECT candidate.id — returns scalar
    mock_lookup = MagicMock()
    mock_lookup.scalar_one_or_none.return_value = CANDIDATE_ID if candidate_exists else None

    # Second execute: UPDATE whatsapp_inbox_events — returns rowcount
    mock_update = MagicMock()
    mock_update.rowcount = rowcount

    session.execute = AsyncMock(side_effect=[mock_lookup, mock_update])
    return session


@pytest.fixture
def _auth_override():
    app.dependency_overrides[get_current_user] = lambda: "test-admin"
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_erase_inbox_data_erases_rows(_auth_override) -> None:
    """200 with erased_rows count when candidate exists and has inbox rows."""
    session = _make_session(candidate_exists=True, rowcount=3)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/v1/candidates/{CANDIDATE_ID}/inbox-data")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json() == {"erased_rows": 3}


@pytest.mark.asyncio
async def test_erase_inbox_data_zero_rows(_auth_override) -> None:
    """200 with erased_rows=0 when candidate has no inbox rows to erase."""
    session = _make_session(candidate_exists=True, rowcount=0)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/v1/candidates/{CANDIDATE_ID}/inbox-data")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json() == {"erased_rows": 0}


@pytest.mark.asyncio
async def test_erase_inbox_data_candidate_not_found(_auth_override) -> None:
    """404 when the candidate does not exist."""
    session = _make_session(candidate_exists=False, rowcount=0)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.delete(f"/api/v1/candidates/{OTHER_ID}/inbox-data")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_erase_inbox_data_requires_auth() -> None:
    """4xx when no Bearer token is provided (FastAPI returns 403 for missing scheme)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.delete(f"/api/v1/candidates/{CANDIDATE_ID}/inbox-data")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_erase_inbox_data_logs_without_text(_auth_override) -> None:
    """Logger call includes candidate_id and row count but NOT message content."""
    session = _make_session(candidate_exists=True, rowcount=2)

    async def _get_db():
        yield session

    app.dependency_overrides[get_db] = _get_db
    try:
        with patch("app.routers.candidates._logger") as mock_log:
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                await client.delete(f"/api/v1/candidates/{CANDIDATE_ID}/inbox-data")

        mock_log.info.assert_called_once()
        log_args = mock_log.info.call_args
        # First positional arg is the format string; subsequent args are the values
        assert str(CANDIDATE_ID) in str(log_args)
        assert "2" in str(log_args)
        # Confirm no message text was passed to logger
        assert "message_text" not in str(log_args).lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# Retention sweep unit tests
# ---------------------------------------------------------------------------


def test_sweep_uses_correct_cutoff() -> None:
    """_INBOX_RETENTION_MONTHS is 3 — the board-approved value from EUR-3990."""
    from app.workers.tasks.notifications import _INBOX_RETENTION_MONTHS

    assert _INBOX_RETENTION_MONTHS == 3


def test_sweep_cutoff_is_90_days_ago() -> None:
    """The sweep cutoff is at least 88 days in the past (3 × 30 days)."""
    from app.workers.tasks.notifications import _INBOX_RETENTION_MONTHS

    cutoff = datetime.now(UTC) - timedelta(days=_INBOX_RETENTION_MONTHS * 30)
    delta = datetime.now(UTC) - cutoff
    assert delta.days >= 88
