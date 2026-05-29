"""
Tests for POST /api/v1/invoices — invoice creation and send_invoice_sent wiring.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth.middleware import get_current_user
from app.database import get_db
from app.main import app

NOW = datetime.now(UTC)

VALID_PAYLOAD = {
    "client_id": str(uuid.uuid4()),
    "invoice_number": "FV/2026/001",
    "sale_date": NOW.isoformat(),
    "due_date": NOW.isoformat(),
    "net_amount": "10000.00",
    "vat_amount": "2300.00",
    "gross_amount": "12300.00",
    "vat_rate": "23.00",
    "currency": "PLN",
}


def _make_invoice(client_id: uuid.UUID) -> MagicMock:
    inv = MagicMock()
    inv.id = uuid.uuid4()
    inv.client_id = client_id
    inv.invoice_number = "FV/2026/001"
    inv.sale_date = NOW
    inv.due_date = NOW
    inv.net_amount = Decimal("10000.00")
    inv.vat_amount = Decimal("2300.00")
    inv.gross_amount = Decimal("12300.00")
    inv.vat_rate = Decimal("23.00")
    inv.currency = "PLN"
    inv.payment_status = "pending"
    inv.period_start = None
    inv.period_end = None
    inv.created_at = NOW
    inv.updated_at = NOW
    return inv


@pytest.fixture
def mock_db(request):
    client_id = uuid.UUID(VALID_PAYLOAD["client_id"])
    inv = _make_invoice(client_id)

    session = AsyncMock()
    session.add = MagicMock()

    # get() returns a client or None depending on scenario
    scenario = getattr(request, "param", "ok")

    async def _get(model, pk):
        from app.models.clients import Client
        from app.models.invoices import Invoice
        if model is Client:
            if scenario == "no_client":
                return None
            c = MagicMock()
            c.id = client_id
            return c
        if model is Invoice:
            return inv
        return None

    session.get = _get

    async def _execute(stmt):
        # For the duplicate-number check: return nothing (no duplicate)
        result = MagicMock()
        if scenario == "duplicate":
            result.scalar_one_or_none.return_value = inv
        else:
            result.scalar_one_or_none.return_value = None
        return result

    session.execute = _execute

    async def _refresh(obj):
        obj.id = inv.id
        obj.client_id = client_id
        obj.invoice_number = "FV/2026/001"
        obj.sale_date = NOW
        obj.due_date = NOW
        obj.net_amount = Decimal("10000.00")
        obj.vat_amount = Decimal("2300.00")
        obj.gross_amount = Decimal("12300.00")
        obj.vat_rate = Decimal("23.00")
        obj.currency = "PLN"
        obj.payment_status = "pending"
        obj.period_start = None
        obj.period_end = None
        obj.created_at = NOW
        obj.updated_at = NOW

    session.refresh = _refresh
    return session


def _override_db(session):
    async def _get():
        yield session
    return _get


def _setup_overrides(session):
    app.dependency_overrides[get_db] = _override_db(session)
    app.dependency_overrides[get_current_user] = lambda: "testuser"


def _teardown_overrides():
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.anyio
@patch("app.routers.invoices.celery_client")
async def test_create_invoice_triggers_notification(mock_celery, mock_db):
    """POST /api/v1/invoices should enqueue send_invoice_sent after creation."""
    _setup_overrides(mock_db)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/v1/invoices", json=VALID_PAYLOAD)
    _teardown_overrides()

    assert resp.status_code == 201
    mock_celery.send_task.assert_called_once()
    assert mock_celery.send_task.call_args[0][0] == "workers.tasks.notifications.send_invoice_sent"


@pytest.mark.anyio
@pytest.mark.parametrize("mock_db", ["no_client"], indirect=True)
async def test_create_invoice_unknown_client_returns_404(mock_db):
    _setup_overrides(mock_db)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/v1/invoices", json=VALID_PAYLOAD)
    _teardown_overrides()
    assert resp.status_code == 404


@pytest.mark.anyio
@pytest.mark.parametrize("mock_db", ["duplicate"], indirect=True)
async def test_create_invoice_duplicate_number_returns_409(mock_db):
    _setup_overrides(mock_db)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/v1/invoices", json=VALID_PAYLOAD)
    _teardown_overrides()
    assert resp.status_code == 409


@pytest.mark.anyio
@patch("app.routers.invoices.celery_client")
async def test_create_invoice_celery_failure_is_non_blocking(mock_celery, mock_db):
    """Celery dispatch failure must not cause a 5xx."""
    mock_celery.send_task.side_effect = Exception("Redis unavailable")
    _setup_overrides(mock_db)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/api/v1/invoices", json=VALID_PAYLOAD)
    _teardown_overrides()
    assert resp.status_code == 201
