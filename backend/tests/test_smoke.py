"""
Backend API smoke tests — EUR-173

Verify that every major GET endpoint:
  - returns HTTP 200
  - returns valid JSON with the expected top-level keys
  - handles an empty database (no 500 errors from missing rows)

Auth is bypassed by overriding get_current_user.
Database is mocked so that all queries return empty results without requiring
a real PostgreSQL instance.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.middleware import get_current_user
from app.database import get_db
from app.main import app

# ---------------------------------------------------------------------------
# Shared DB mock
# ---------------------------------------------------------------------------


def _make_result_mock(scalars_return=None, scalar_one_return=0, all_return=None):
    """
    Build a mock SQLAlchemy CursorResult that covers the patterns used by all
    routers:
      result.scalar_one()          → count queries → 0
      result.scalars().all()       → list queries  → []
      result.scalar_one_or_none()  → lookup        → None
      result.all()                 → joined rows   → []
    """
    result = MagicMock()
    result.scalar_one.return_value = scalar_one_return
    result.scalar_one_or_none.return_value = None

    scalars_mock = MagicMock()
    scalars_mock.all.return_value = scalars_return if scalars_return is not None else []
    result.scalars.return_value = scalars_mock

    result.all.return_value = all_return if all_return is not None else []
    return result


def _make_db_session() -> AsyncMock:
    """AsyncSession mock that always returns empty/zero results."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=_make_result_mock())
    return session


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def override_dependencies():
    """Override auth and DB for all smoke tests in this module."""

    async def _no_auth():
        return "smoke_test_user"

    async def _mock_db():
        yield _make_db_session()

    app.dependency_overrides[get_current_user] = _no_auth
    app.dependency_overrides[get_db] = _mock_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_workers(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/workers")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_get_workers_with_filters(client: AsyncClient) -> None:
    """Filters must not cause 500 errors."""
    resp = await client.get(
        "/api/v1/workers",
        params={"expiring_docs": "true", "show_archived": "true", "q": "Kowalski"},
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.asyncio
async def test_get_candidates(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/candidates")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_clients(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/clients")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_job_postings(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/job-postings")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


# ---------------------------------------------------------------------------
# Phase 1–3 endpoints
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_job_orders(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/job-orders")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_accommodations(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/accommodations")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_vehicles(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/vehicles")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_transport_routes(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/transport-routes")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_document_templates(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/document-templates")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_compliance_alerts(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/compliance/alerts")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "alerts" in data
    assert "total" in data
    assert "critical_count" in data
    assert "warning_count" in data
    assert "info_count" in data
    assert isinstance(data["alerts"], list)


@pytest.mark.asyncio
async def test_get_compliance_alerts_severity_filter(client: AsyncClient) -> None:
    for severity in ("critical", "warning", "info"):
        resp = await client.get("/api/v1/compliance/alerts", params={"severity": severity})
        assert resp.status_code == 200, f"severity={severity}: {resp.text}"


@pytest.mark.asyncio
async def test_get_placements_calendar(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/placements/calendar")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_get_prospects(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/prospects")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "items" in data
    assert "total" in data


# ---------------------------------------------------------------------------
# Status filter smoke tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_job_orders_status_filter(client: AsyncClient) -> None:
    for status in ("open", "sourcing", "filled", "cancelled"):
        resp = await client.get("/api/v1/job-orders", params={"status": status})
        assert resp.status_code == 200, f"status={status}: {resp.text}"


@pytest.mark.asyncio
async def test_get_candidates_due_reminders(client: AsyncClient) -> None:
    """Sidebar reminder count endpoint must return a valid shape."""
    resp = await client.get("/api/v1/candidates/reminders/due")
    assert resp.status_code == 200, resp.text


# ---------------------------------------------------------------------------
# 401 without auth (sanity check that override actually works)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_workers_returns_401_without_token() -> None:
    """Confirm that auth IS enforced when we don't override it."""
    app.dependency_overrides.clear()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await c.get("/api/v1/workers")
    assert resp.status_code == 401
