"""Tests for POST /api/webhooks/elevenlabs/conversation-end (EUR-1575)."""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.enums import ConversationIntent, HRappkaSyncStatus
from app.routers.webhooks import (
    _extract_intent,
    _extract_client_fields,
    _verify_elevenlabs_signature,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

WEBHOOK_URL = "/api/webhooks/elevenlabs/conversation-end"
_SECRET = "test-secret-key"


def _sign(body: bytes, secret: str = _SECRET, timestamp: str = "1234567890") -> str:
    signed = f"{timestamp}.".encode() + body
    sig = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"t={timestamp},v0={sig}"


def _make_payload(
    conversation_id: str = "conv_abc123",
    intent: str = "client_inquiry",
    phone: str = "+48123456789",
) -> dict[str, Any]:
    return {
        "type": "post_call_transcription",
        "data": {
            "conversation_id": conversation_id,
            "agent_id": "agent_xyz",
            "metadata": {
                "phone_number": phone,
                "start_time_unix_secs": 1700000000,
                "call_duration_secs": 90,
            },
            "analysis": {
                "transcript_summary": "Client interested in warehouse staffing",
                "data_collection_results": {
                    "intent": {"value": intent, "rationale": ""},
                    "company_name": {"value": "Test Sp z o.o.", "rationale": ""},
                    "nip": {"value": "1234567890", "rationale": ""},
                    "contact_email": {"value": "test@example.com", "rationale": ""},
                    "contact_phone": {"value": "+48987654321", "rationale": ""},
                    "city": {"value": "Warszawa", "rationale": ""},
                    "country": {"value": "PL", "rationale": ""},
                },
            },
        },
    }


# ---------------------------------------------------------------------------
# Unit tests — pure functions
# ---------------------------------------------------------------------------


class TestVerifyElevenLabsSignature:
    def test_valid_signature(self) -> None:
        body = b'{"hello": "world"}'
        header = _sign(body)
        assert _verify_elevenlabs_signature(body, header) is True

    def test_wrong_secret(self) -> None:
        body = b'{"hello": "world"}'
        header = _sign(body, secret="wrong-secret")
        with patch("app.routers.webhooks.settings") as mock_settings:
            mock_settings.elevenlabs_webhook_secret = _SECRET
            assert _verify_elevenlabs_signature(body, header) is False

    def test_malformed_header_returns_false(self) -> None:
        with patch("app.routers.webhooks.settings") as mock_settings:
            mock_settings.elevenlabs_webhook_secret = _SECRET
            assert _verify_elevenlabs_signature(b"body", "not-a-valid-header") is False

    def test_no_secret_configured_passes(self) -> None:
        with patch("app.routers.webhooks.settings") as mock_settings:
            mock_settings.elevenlabs_webhook_secret = ""
            assert _verify_elevenlabs_signature(b"body", "anything") is True


class TestExtractIntent:
    def test_client_inquiry(self) -> None:
        ev = {"data_collection_results": {"intent": {"value": "client_inquiry"}}}
        assert _extract_intent(ev) == ConversationIntent.client_inquiry

    def test_candidate_application(self) -> None:
        ev = {"data_collection_results": {"intent": {"value": "candidate_application"}}}
        assert _extract_intent(ev) == ConversationIntent.candidate_application

    def test_raw_string_value(self) -> None:
        ev = {"data_collection_results": {"intent": "client_inquiry"}}
        assert _extract_intent(ev) == ConversationIntent.client_inquiry

    def test_unknown_value_falls_back_to_other(self) -> None:
        ev = {"data_collection_results": {"intent": {"value": "unknown_value"}}}
        assert _extract_intent(ev) == ConversationIntent.other

    def test_missing_intent_falls_back_to_other(self) -> None:
        assert _extract_intent({}) == ConversationIntent.other


class TestExtractClientFields:
    def test_extracts_all_fields(self) -> None:
        ev = {
            "data_collection_results": {
                "company_name": {"value": "Acme Sp z o.o."},
                "nip": {"value": "9876543210"},
                "contact_email": {"value": "hr@acme.pl"},
                "contact_phone": {"value": "+48111222333"},
                "city": {"value": "Poznań"},
                "country": {"value": "PL"},
            }
        }
        fields = _extract_client_fields(ev)
        assert fields["company_name"] == "Acme Sp z o.o."
        assert fields["nip"] == "9876543210"
        assert fields["email"] == "hr@acme.pl"
        assert fields["phone"] == "+48111222333"
        assert fields["city"] == "Poznań"
        assert fields["country"] == "PL"

    def test_missing_fields_return_none(self) -> None:
        fields = _extract_client_fields({})
        assert fields["company_name"] is None
        assert fields["nip"] is None


# ---------------------------------------------------------------------------
# Integration tests — HTTP endpoint
# ---------------------------------------------------------------------------


class TestElevenLabsWebhookEndpoint:
    def _client(self) -> TestClient:
        return TestClient(app, raise_server_exceptions=True)

    @patch("app.routers.webhooks.settings")
    @patch("app.routers.webhooks.AsyncSessionLocal")
    def test_missing_conversation_id_returns_422(
        self, mock_session_local: MagicMock, mock_settings: MagicMock
    ) -> None:
        mock_settings.elevenlabs_webhook_secret = ""  # skip sig check
        body = json.dumps({"data": {}}).encode()
        client = self._client()
        resp = client.post(WEBHOOK_URL, content=body, headers={"Content-Type": "application/json"})
        assert resp.status_code == 422

    @patch("app.routers.webhooks.settings")
    @patch("app.routers.webhooks.AsyncSessionLocal")
    async def test_duplicate_delivery_returns_ok_with_note(
        self, mock_session_cm: MagicMock, mock_settings: MagicMock
    ) -> None:
        mock_settings.elevenlabs_webhook_secret = ""

        existing_conv = MagicMock()
        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_conv
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_session_cm.return_value.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.return_value.__aexit__ = AsyncMock(return_value=None)

        payload = _make_payload()
        body = json.dumps(payload).encode()
        client = self._client()
        resp = client.post(WEBHOOK_URL, content=body, headers={"Content-Type": "application/json"})
        assert resp.status_code == 200
        assert resp.json().get("note") == "duplicate"

    @patch("app.routers.webhooks.settings")
    @patch("app.routers.webhooks.AsyncSessionLocal")
    async def test_candidate_application_skips_hrappka(
        self, mock_session_cm: MagicMock, mock_settings: MagicMock
    ) -> None:
        mock_settings.elevenlabs_webhook_secret = ""

        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # not a duplicate
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_session_cm.return_value.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.return_value.__aexit__ = AsyncMock(return_value=None)

        payload = _make_payload(intent="candidate_application")
        body = json.dumps(payload).encode()

        with patch("app.routers.webhooks._sync_client_to_hrappka") as mock_sync:
            client = self._client()
            resp = client.post(
                WEBHOOK_URL, content=body, headers={"Content-Type": "application/json"}
            )
            assert resp.status_code == 200
            mock_sync.assert_not_called()

    @patch("app.routers.webhooks.settings")
    @patch("app.routers.webhooks.AsyncSessionLocal")
    async def test_client_inquiry_schedules_hrappka_sync(
        self, mock_session_cm: MagicMock, mock_settings: MagicMock
    ) -> None:
        mock_settings.elevenlabs_webhook_secret = ""

        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_session_cm.return_value.__aenter__ = AsyncMock(return_value=mock_db)
        mock_session_cm.return_value.__aexit__ = AsyncMock(return_value=None)

        payload = _make_payload(intent="client_inquiry")
        body = json.dumps(payload).encode()

        with patch("app.routers.webhooks._sync_client_to_hrappka") as mock_sync:
            client = self._client()
            resp = client.post(
                WEBHOOK_URL, content=body, headers={"Content-Type": "application/json"}
            )
            assert resp.status_code == 200
            # BackgroundTasks calls mock_sync via add_task; TestClient runs them inline
            mock_sync.assert_called_once_with(payload["data"]["conversation_id"])
