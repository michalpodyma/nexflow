"""
Tests for the shift scheduling router — /api/v1/shifts/*

Uses httpx + FastAPI dependency overrides (same pattern as test_invoices.py).
The database is fully mocked; no live Postgres connection required.
"""

import uuid
from datetime import UTC, datetime, time
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.middleware import get_current_user
from app.database import get_db
from app.main import app

# ── Fixtures ──────────────────────────────────────────────────────────────────

NOW = datetime.now(UTC)
TODAY = NOW.date()

CLIENT_ID = uuid.uuid4()
WORKER_ID = uuid.uuid4()
TEMPLATE_ID = uuid.uuid4()
ENTRY_ID = uuid.uuid4()


def _make_client() -> MagicMock:
    c = MagicMock()
    c.id = CLIENT_ID
    c.company_name = "Acme Logistics GmbH"
    return c


def _make_worker() -> MagicMock:
    w = MagicMock()
    w.id = WORKER_ID
    w.first_name = "Jan"
    w.last_name = "Kowalski"
    return w


def _make_template() -> MagicMock:
    t = MagicMock()
    t.id = TEMPLATE_ID
    t.client_id = CLIENT_ID
    t.name = "Morning Shift"
    t.position = "Warehouse Picker"
    t.days_of_week = [0, 1, 2, 3, 4]
    t.start_time = time(6, 0)
    t.end_time = time(14, 0)
    t.capacity = 5
    t.is_active = True
    t.created_at = NOW
    t.updated_at = NOW
    return t


def _make_entry() -> MagicMock:
    e = MagicMock()
    e.id = ENTRY_ID
    e.template_id = TEMPLATE_ID
    e.worker_id = WORKER_ID
    e.client_id = CLIENT_ID
    e.shift_date = TODAY
    e.start_dt = datetime(TODAY.year, TODAY.month, TODAY.day, 6, 0, tzinfo=UTC)
    e.end_dt = datetime(TODAY.year, TODAY.month, TODAY.day, 14, 0, tzinfo=UTC)
    e.notes = None
    e.created_at = NOW
    return e


def _override_db(session):
    async def _get():
        yield session

    return _get


def _setup(session):
    app.dependency_overrides[get_db] = _override_db(session)
    app.dependency_overrides[get_current_user] = lambda: "testuser"


def _teardown():
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


# ── Template tests ────────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_list_templates_empty():
    """GET /api/v1/shifts/templates returns [] when no templates exist."""
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = []
    session.execute = AsyncMock(return_value=result)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/shifts/templates")
    _teardown()

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.anyio
async def test_list_templates_returns_items():
    """GET /api/v1/shifts/templates returns template list with client names."""
    template = _make_template()
    client = _make_client()

    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = [(template, client)]
    session.execute = AsyncMock(return_value=result)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/shifts/templates")
    _teardown()

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Morning Shift"
    assert data[0]["client_name"] == "Acme Logistics GmbH"
    assert data[0]["days_of_week"] == [0, 1, 2, 3, 4]
    assert data[0]["start_time"] == "06:00"
    assert data[0]["end_time"] == "14:00"
    assert data[0]["capacity"] == 5


@pytest.mark.anyio
async def test_create_template_success():
    """POST /api/v1/shifts/templates creates a template and returns 201."""
    client = _make_client()
    _make_template()

    session = AsyncMock()
    session.get = AsyncMock(return_value=client)
    session.add = MagicMock()

    async def _refresh(obj):
        obj.id = TEMPLATE_ID
        obj.client_id = CLIENT_ID
        obj.name = "Morning Shift"
        obj.position = "Warehouse Picker"
        obj.days_of_week = [0, 1, 2, 3, 4]
        obj.start_time = time(6, 0)
        obj.end_time = time(14, 0)
        obj.capacity = 5
        obj.is_active = True
        obj.created_at = NOW
        obj.updated_at = NOW

    session.refresh = _refresh

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/shifts/templates",
            json={
                "client_id": str(CLIENT_ID),
                "name": "Morning Shift",
                "position": "Warehouse Picker",
                "days_of_week": [0, 1, 2, 3, 4],
                "start_time": "06:00:00",
                "end_time": "14:00:00",
                "capacity": 5,
            },
        )
    _teardown()

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Morning Shift"
    assert data["capacity"] == 5


@pytest.mark.anyio
async def test_create_template_unknown_client_returns_404():
    """POST /api/v1/shifts/templates with unknown client_id → 404."""
    session = AsyncMock()
    session.get = AsyncMock(return_value=None)  # client not found

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/shifts/templates",
            json={
                "client_id": str(uuid.uuid4()),
                "name": "Night Shift",
                "position": "Forklift",
                "days_of_week": [0, 1, 2],
                "start_time": "22:00:00",
                "end_time": "06:00:00",
                "capacity": 3,
            },
        )
    _teardown()

    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_template_with_entries_returns_409():
    """DELETE /api/v1/shifts/templates/{id} with linked entries → 409."""
    template = _make_template()

    session = AsyncMock()
    session.get = AsyncMock(return_value=template)

    count_result = MagicMock()
    count_result.scalar.return_value = 3  # 3 existing entries
    session.execute = AsyncMock(return_value=count_result)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.delete(f"/api/v1/shifts/templates/{TEMPLATE_ID}")
    _teardown()

    assert resp.status_code == 409
    assert "entries" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_delete_template_no_entries_success():
    """DELETE /api/v1/shifts/templates/{id} with no entries → 204."""
    template = _make_template()

    session = AsyncMock()
    session.get = AsyncMock(return_value=template)
    session.delete = AsyncMock()

    count_result = MagicMock()
    count_result.scalar.return_value = 0
    session.execute = AsyncMock(return_value=count_result)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.delete(f"/api/v1/shifts/templates/{TEMPLATE_ID}")
    _teardown()

    assert resp.status_code == 204


# ── Schedule entry tests ──────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_list_schedule_empty():
    """GET /api/v1/shifts/schedule returns [] when nothing scheduled."""
    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = []
    session.execute = AsyncMock(return_value=result)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/shifts/schedule")
    _teardown()

    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.anyio
async def test_create_schedule_entry_success():
    """POST /api/v1/shifts/schedule creates entry and returns 201."""
    worker = _make_worker()
    client = _make_client()
    _make_entry()

    session = AsyncMock()

    async def _get(model, pk):
        from app.models.clients import Client
        from app.models.workers import Worker
        if model is Worker:
            return worker
        if model is Client:
            return client
        return None

    session.get = _get
    session.add = MagicMock()

    # No conflicts
    conflict_result = MagicMock()
    conflict_result.scalars.return_value.all.return_value = []
    session.execute = AsyncMock(return_value=conflict_result)

    async def _refresh(obj):
        obj.id = ENTRY_ID
        obj.template_id = TEMPLATE_ID
        obj.worker_id = WORKER_ID
        obj.client_id = CLIENT_ID
        obj.shift_date = TODAY
        obj.start_dt = datetime(TODAY.year, TODAY.month, TODAY.day, 6, 0, tzinfo=UTC)
        obj.end_dt = datetime(TODAY.year, TODAY.month, TODAY.day, 14, 0, tzinfo=UTC)
        obj.notes = None
        obj.created_at = NOW

    session.refresh = _refresh

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/shifts/schedule",
            json={
                "template_id": str(TEMPLATE_ID),
                "worker_id": str(WORKER_ID),
                "client_id": str(CLIENT_ID),
                "shift_date": TODAY.isoformat(),
                "start_time": "06:00:00",
                "end_time": "14:00:00",
            },
        )
    _teardown()

    assert resp.status_code == 201
    data = resp.json()
    assert data["worker_name"] == "Jan Kowalski"
    assert data["client_name"] == "Acme Logistics GmbH"
    assert data["shift_date"] == TODAY.isoformat()


@pytest.mark.anyio
async def test_create_schedule_entry_conflict_returns_409():
    """POST /api/v1/shifts/schedule returns 409 when worker has a conflicting shift."""
    worker = _make_worker()
    client = _make_client()
    conflict_entry = _make_entry()

    session = AsyncMock()

    async def _get(model, pk):
        from app.models.clients import Client
        from app.models.workers import Worker
        if model is Worker:
            return worker
        if model is Client:
            return client
        return None

    session.get = _get

    # Return a conflicting entry
    conflict_result = MagicMock()
    conflict_result.scalars.return_value.all.return_value = [conflict_entry]
    session.execute = AsyncMock(return_value=conflict_result)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/shifts/schedule",
            json={
                "template_id": str(TEMPLATE_ID),
                "worker_id": str(WORKER_ID),
                "client_id": str(CLIENT_ID),
                "shift_date": TODAY.isoformat(),
                "start_time": "06:00:00",
                "end_time": "14:00:00",
            },
        )
    _teardown()

    assert resp.status_code == 409
    assert "overlapping" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_create_schedule_entry_worker_not_found():
    """POST /api/v1/shifts/schedule returns 404 when worker_id is unknown."""
    session = AsyncMock()

    async def _get(model, pk):
        from app.models.workers import Worker
        if model is Worker:
            return None
        return None

    session.get = _get

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/shifts/schedule",
            json={
                "worker_id": str(uuid.uuid4()),
                "client_id": str(CLIENT_ID),
                "shift_date": TODAY.isoformat(),
                "start_time": "06:00:00",
                "end_time": "14:00:00",
            },
        )
    _teardown()

    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_schedule_entry_success():
    """DELETE /api/v1/shifts/schedule/{id} returns 204."""
    entry = _make_entry()

    session = AsyncMock()
    session.get = AsyncMock(return_value=entry)
    session.delete = AsyncMock()

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.delete(f"/api/v1/shifts/schedule/{ENTRY_ID}")
    _teardown()

    assert resp.status_code == 204


@pytest.mark.anyio
async def test_delete_schedule_entry_not_found():
    """DELETE /api/v1/shifts/schedule/{id} returns 404 for unknown id."""
    session = AsyncMock()
    session.get = AsyncMock(return_value=None)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.delete(f"/api/v1/shifts/schedule/{uuid.uuid4()}")
    _teardown()

    assert resp.status_code == 404


# ── Conflict check ────────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_conflict_check_no_conflict():
    """GET /api/v1/shifts/conflicts returns has_conflict=false when clear."""
    session = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    session.execute = AsyncMock(return_value=result)

    start = f"{TODAY.isoformat()}T06:00:00+00:00"
    end = f"{TODAY.isoformat()}T14:00:00+00:00"

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/shifts/conflicts",
            params={
                "worker_id": str(WORKER_ID),
                "start_dt": start,
                "end_dt": end,
            },
        )
    _teardown()

    assert resp.status_code == 200
    data = resp.json()
    assert data["has_conflict"] is False
    assert data["conflicting_entries"] == []


@pytest.mark.anyio
async def test_conflict_check_with_conflict():
    """GET /api/v1/shifts/conflicts returns has_conflict=true and entry list."""
    conflict_entry = _make_entry()
    worker = _make_worker()
    client = _make_client()

    session = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = [conflict_entry]
    session.execute = AsyncMock(return_value=result)

    async def _get(model, pk):
        from app.models.clients import Client
        from app.models.workers import Worker
        if model is Worker:
            return worker
        if model is Client:
            return client
        return None

    session.get = _get

    start = f"{TODAY.isoformat()}T06:00:00+00:00"
    end = f"{TODAY.isoformat()}T14:00:00+00:00"

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/shifts/conflicts",
            params={
                "worker_id": str(WORKER_ID),
                "start_dt": start,
                "end_dt": end,
            },
        )
    _teardown()

    assert resp.status_code == 200
    data = resp.json()
    assert data["has_conflict"] is True
    assert len(data["conflicting_entries"]) == 1
    assert data["conflicting_entries"][0]["worker_name"] == "Jan Kowalski"


# ── Capacity ──────────────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_capacity_returns_slots():
    """GET /api/v1/shifts/capacity returns slot list for active templates."""
    template = _make_template()
    client = _make_client()

    call_count = 0

    async def _execute(stmt):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        if call_count == 1:
            # First call: list templates
            result.all.return_value = [(template, client)]
        else:
            # Second call: booked counts (none booked)
            result.all.return_value = []
        return result

    session = AsyncMock()
    session.execute = _execute

    # Use a specific week where TODAY lands on a Mon–Fri template
    monday = TODAY - __import__("datetime").timedelta(days=TODAY.weekday())

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/shifts/capacity",
            params={
                "start": monday.isoformat(),
                "end": (monday + __import__("datetime").timedelta(days=6)).isoformat(),
            },
        )
    _teardown()

    assert resp.status_code == 200
    slots = resp.json()
    # Mon–Fri template → 5 slots in a Mon–Sun window
    assert len(slots) == 5
    for slot in slots:
        assert slot["capacity"] == 5
        assert slot["booked"] == 0
        assert slot["available"] == 5


# ── Export ────────────────────────────────────────────────────────────────────


@pytest.mark.anyio
async def test_export_returns_csv():
    """GET /api/v1/shifts/export returns a CSV file."""
    entry = _make_entry()
    worker = _make_worker()
    client = _make_client()

    session = AsyncMock()
    result = MagicMock()
    result.all.return_value = [(entry, worker, client, None)]
    session.execute = AsyncMock(return_value=result)

    _setup(session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/shifts/export")
    _teardown()

    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment" in resp.headers.get("content-disposition", "")
    # CSV should contain the worker's last name
    assert "Kowalski" in resp.text
