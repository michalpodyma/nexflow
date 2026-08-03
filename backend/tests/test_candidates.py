"""
Tests for POST/PATCH /api/v1/candidates — candidate intake and profile-completion.

POST validation errors (invalid phone, missing fields, GDPR not true) are handled
by Pydantic before the route handler runs, so no DB mock is needed for those.
PATCH tests (EUR-2058) cover new profile-completion fields, partial update
semantics, and validator 422 responses.
"""

import uuid
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.middleware import get_current_user
from app.database import get_db
from app.main import app

TODAY = date.today().isoformat()
NOW_ISO = datetime.now(UTC).isoformat()

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
    now = datetime.now(UTC)

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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/candidates", json=payload)
    assert response.status_code == 201
    assert response.json()["phone"] == "+491701234567"


# ---------------------------------------------------------------------------
# EUR-2058 — PATCH /api/v1/candidates/{id}: profile-completion fields
# ---------------------------------------------------------------------------

def _make_candidate_mock(candidate_id: uuid.UUID | None = None) -> MagicMock:
    """Return a mock Candidate ORM object with all EUR-2058 fields."""
    now = datetime.now(UTC)
    cid = candidate_id or uuid.uuid4()
    obj = MagicMock()
    obj.id = cid
    obj.first_name = "WhatsApp"
    obj.last_name = "Unknown"
    obj.phone = "+48510680591"
    obj.email = None
    obj.nationality = None
    obj.availability_from = None
    obj.preferred_position = None
    obj.languages = None
    obj.location_preference = None
    obj.gdpr_consent = False
    obj.gdpr_consent_at = None
    obj.gdpr_delete_at = None
    obj.notes = None
    obj.screening_status = "new"
    obj.screening_score = None
    obj.contacted_at = None
    obj.job_posting_id = None
    obj.referred_by = None
    obj.worker_id = None
    obj.created_at = now
    obj.updated_at = now
    return obj


@pytest.fixture
def patch_db_with_candidate():
    """Override get_db and get_current_user; return the mock candidate object."""
    candidate = _make_candidate_mock()

    async def _execute_result(*args, **kwargs):
        result = MagicMock()
        result.scalar_one_or_none.return_value = candidate
        return result

    session = AsyncMock()
    session.execute.side_effect = _execute_result
    session.commit = AsyncMock()
    session.refresh = AsyncMock()

    async def _get_mock_db():
        yield session

    app.dependency_overrides[get_db] = _get_mock_db
    app.dependency_overrides[get_current_user] = lambda: "test-user"
    yield candidate
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_patch_profile_fields_persisted(patch_db_with_candidate: MagicMock) -> None:
    """PATCH first_name+last_name+nationality+gdpr_consent+gdpr_consent_at → 200, persisted."""
    candidate = patch_db_with_candidate
    cid = str(candidate.id)

    payload = {
        "first_name": "Hubert",
        "last_name": "Mielcarek",
        "nationality": "PL",
        "gdpr_consent": True,
        "gdpr_consent_at": NOW_ISO,
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.patch(f"/api/v1/candidates/{cid}", json=payload)

    assert resp.status_code == 200
    assert candidate.first_name == "Hubert"
    assert candidate.last_name == "Mielcarek"
    assert candidate.nationality == "PL"
    assert candidate.gdpr_consent is True
    assert candidate.gdpr_consent_at is not None


@pytest.mark.asyncio
async def test_patch_partial_leaves_other_fields_untouched(patch_db_with_candidate: MagicMock) -> None:
    """Sending only first_name must not wipe email or availability_from."""
    candidate = patch_db_with_candidate
    candidate.email = "existing@example.com"
    candidate.availability_from = datetime(2026, 7, 1, tzinfo=UTC)
    cid = str(candidate.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.patch(f"/api/v1/candidates/{cid}", json={"first_name": "Hubert"})

    assert resp.status_code == 200
    assert candidate.first_name == "Hubert"
    # Fields not in payload must not have been touched
    assert candidate.email == "existing@example.com"
    assert candidate.availability_from == datetime(2026, 7, 1, tzinfo=UTC)


@pytest.mark.asyncio
async def test_patch_invalid_phone_returns_422(patch_db_with_candidate: MagicMock) -> None:
    """Invalid phone format must be rejected with 422 before hitting DB."""
    cid = str(patch_db_with_candidate.id)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.patch(
            f"/api/v1/candidates/{cid}",
            json={"phone": "not-a-phone"},
        )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_patch_invalid_nationality_returns_422(patch_db_with_candidate: MagicMock) -> None:
    """3-letter nationality code must be rejected with 422 before hitting DB."""
    cid = str(patch_db_with_candidate.id)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.patch(
            f"/api/v1/candidates/{cid}",
            json={"nationality": "POL"},
        )
    assert resp.status_code == 422
