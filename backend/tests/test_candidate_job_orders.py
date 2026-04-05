"""
Tests for PATCH /api/v1/candidates/{id}/job-orders/{job_order_id} — placement flow.

Verifies that when a candidate is placed:
  - Candidate.gdpr_delete_at is set to None
  - The newly created Worker.gdpr_delete_at is also None (not auto-set by DB trigger)
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.middleware import get_current_user
from app.database import get_db
from app.main import app
from app.models.candidate_job_orders import CandidateJobOrder
from app.models.candidates import Candidate
from app.models.enums import CandidateJobOrderStatus, ScreeningStatus
from app.models.job_orders import JobOrder
from app.models.workers import Worker


def _make_candidate() -> MagicMock:
    now = datetime.now(timezone.utc)
    c = MagicMock(spec=Candidate)
    c.id = uuid.uuid4()
    c.first_name = "Anna"
    c.last_name = "Nowak"
    c.phone = "+48123456789"
    c.email = None
    c.nationality = "PL"
    c.gdpr_consent = True
    c.gdpr_consent_at = now
    c.worker_id = None
    c.screening_status = ScreeningStatus.new
    c.gdpr_delete_at = now  # simulates trigger-set value before placement
    return c


def _make_job_order() -> MagicMock:
    jo = MagicMock(spec=JobOrder)
    jo.id = uuid.uuid4()
    return jo


def _make_link(candidate_id: uuid.UUID, job_order_id: uuid.UUID) -> MagicMock:
    link = MagicMock(spec=CandidateJobOrder)
    link.id = uuid.uuid4()
    link.candidate_id = candidate_id
    link.job_order_id = job_order_id
    link.status = CandidateJobOrderStatus.submitted
    link.submitted_at = datetime.now(timezone.utc)
    return link


@pytest.fixture
def placement_db(monkeypatch) -> AsyncMock:
    """
    Mock AsyncSession that simulates candidate placement:
    - db.get(Candidate, ...) returns a candidate with worker_id=None
    - db.get(JobOrder, ...) returns a job order
    - scalar_one_or_none() on execute returns the existing CandidateJobOrder link
    - flush/commit/refresh are no-ops that populate required fields
    """
    candidate = _make_candidate()
    job_order = _make_job_order()
    link = _make_link(candidate.id, job_order.id)

    captured_workers: list[Worker] = []
    session = AsyncMock()

    async def _get(model, pk):
        if model is Candidate:
            return candidate
        if model is JobOrder:
            return job_order
        return None

    session.get = _get

    # execute() returns a result whose scalar_one_or_none() gives the link
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = link
    session.execute = AsyncMock(return_value=mock_result)

    def _add(obj):
        if isinstance(obj, Worker):
            captured_workers.append(obj)

    session.add = _add

    async def _flush():
        # Assign an id to any worker that was added (mimics DB flush)
        for w in captured_workers:
            if not hasattr(w, "id") or w.id is None:
                w.id = uuid.uuid4()

    session.flush = _flush

    async def _refresh(obj):
        if isinstance(obj, CandidateJobOrder):
            obj.submitted_at = link.submitted_at

    session.refresh = _refresh

    async def _get_mock_db():
        yield session

    app.dependency_overrides[get_db] = _get_mock_db
    app.dependency_overrides[get_current_user] = lambda: "test-user"

    # Expose for assertions
    session._candidate = candidate
    session._captured_workers = captured_workers

    yield session

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_placement_clears_worker_gdpr_delete_at(placement_db: AsyncMock) -> None:
    """Placing a candidate must create a Worker with gdpr_delete_at=None."""
    candidate = placement_db._candidate
    job_order_id = uuid.uuid4()  # id used in URL; db.get is mocked anyway

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Inject auth header to satisfy CurrentUser dependency
        response = await client.patch(
            f"/api/v1/candidates/{candidate.id}/job-orders/{job_order_id}",
            json={"status": "placed"},
        )

    # A Worker should have been created
    assert len(placement_db._captured_workers) == 1, "Expected exactly one Worker to be created"
    worker = placement_db._captured_workers[0]
    assert worker.gdpr_delete_at is None, (
        "Worker.gdpr_delete_at must be None for an actively placed worker"
    )


@pytest.mark.asyncio
async def test_placement_clears_candidate_gdpr_delete_at(placement_db: AsyncMock) -> None:
    """Placing a candidate must set Candidate.gdpr_delete_at to None."""
    candidate = placement_db._candidate
    job_order_id = uuid.uuid4()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.patch(
            f"/api/v1/candidates/{candidate.id}/job-orders/{job_order_id}",
            json={"status": "placed"},
        )

    assert candidate.gdpr_delete_at is None, (
        "Candidate.gdpr_delete_at must be cleared on placement"
    )
    assert candidate.screening_status == ScreeningStatus.hired
