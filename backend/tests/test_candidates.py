"""
Tests for POST /api/v1/candidates — the public candidate intake endpoint.

Validation errors (invalid phone, missing fields, GDPR not true) are handled
by Pydantic before the route handler runs, so no DB or Celery mock is needed
for those cases. The valid-submission test overrides the DB dependency and
patches Celery dispatch.
"""

import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import get_db
from app.main import app

TODAY = date.today().isoformat()
NOW_ISO = datetime.now(timezone.utc).isoformat()

VALID_PAYLOAD: dict = {
    "first_name": "Jan",
    "last_name": "Kowalski",
    "phone": "+48123456789",
    "nationality": "PL",
    "availability_from": TODAY,
    "preferred_position": "warehouse_picker",
    "languages": ["pl", "en"],
    "gdpr_consent": True,
    "gdpr_consent_at": NOW_ISO,
}


@pytest.fixture
def mock_db_session() -> AsyncMock:
    """AsyncSession mock that fakes flush/commit/refresh without hitting the DB."""
    candidate_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    session = AsyncMock()
    session.add = MagicMock()

    async def _refresh(obj: object) -> None:
        obj.id = candidate_id  # type: ignore[attr-defined]
        obj.screening_status = "new"  # type: ignore[attr-defined]
        obj.screening_score = None  # type: ignore[attr-defined]
        obj.gdpr_delete_at = None  # type: ignore[attr-defined]
        obj.created_at = now  # type: ignore[attr-defined]
        obj.updated_at = now  # type: ignore[attr-defined]

    session.refresh = _refresh
    return session


@pytest.fixture
def override_db(mock_db_session: AsyncMock):
    """Override the get_db dependency with the mock session for a single test."""

    async def _get_mock_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = _get_mock_db
    yield mock_db_session
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_valid_submission(override_db: AsyncMock) -> None:
    with patch.object(app.state, "celery_client", create=True), patch(
        "app.routers.candidates.celery_client"
    ) as mock_celery:
        mock_celery.send_task = MagicMock()
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/v1/candidates", json=VALID_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "Jan"
    assert data["last_name"] == "Kowalski"
    assert data["phone"] == "+48123456789"
    assert data["gdpr_consent"] is True
    assert data["screening_status"] == "new"
    assert mock_celery.send_task.called


@pytest.mark.asyncio
async def test_missing_required_fields() -> None:
    """Payload missing last_name, phone, nationality, etc. — should fail validation."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/candidates",
            json={"first_name": "Jan", "gdpr_consent": True, "gdpr_consent_at": NOW_ISO},
        )
    assert response.status_code == 422
    detail = response.json()["detail"]
    # Multiple fields should be flagged
    missing_fields = {err["loc"][-1] for err in detail}
    assert "last_name" in missing_fields
    assert "phone" in missing_fields
    assert "nationality" in missing_fields


@pytest.mark.asyncio
async def test_invalid_phone_format() -> None:
    """Phone not in E.164 PL/DE format must be rejected."""
    payload = {**VALID_PAYLOAD, "phone": "123456789"}  # missing + prefix
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/candidates", json=payload)
    assert response.status_code == 422

    payload_uk = {**VALID_PAYLOAD, "phone": "+44123456789"}  # UK number — not allowed
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/candidates", json=payload_uk)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_missing_gdpr_consent() -> None:
    """gdpr_consent=False must be rejected with 422."""
    payload = {**VALID_PAYLOAD, "gdpr_consent": False}
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/candidates", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_german_phone_accepted(override_db: AsyncMock) -> None:
    """German E.164 numbers (+49...) must be accepted."""
    payload = {**VALID_PAYLOAD, "phone": "+491701234567"}
    with patch("app.routers.candidates.celery_client") as mock_celery:
        mock_celery.send_task = MagicMock()
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/api/v1/candidates", json=payload)
    assert response.status_code == 201
    assert response.json()["phone"] == "+491701234567"
