"""
Tests for:
  - GET  /api/webhooks/whatsapp  — Meta verification challenge
  - POST /api/webhooks/whatsapp  — inbound message processing (mocked FSM)
  - services/whatsapp.py         — normalize_phone, send_whatsapp_message
  - services/chatbot_fsm.py      — compute_score, _t (locale lookup)
"""

import hashlib
import hmac
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.whatsapp import normalize_phone
from app.services.chatbot_fsm import compute_score, _t


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

VERIFY_TOKEN = "test-verify-token"
APP_SECRET = "test-app-secret"


def _make_meta_payload(from_phone: str, text: str) -> dict:
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WABA_ID",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "48100000000",
                                "phone_number_id": "PHONE_ID",
                            },
                            "contacts": [{"profile": {"name": "Test User"}, "wa_id": from_phone}],
                            "messages": [
                                {
                                    "from": from_phone,
                                    "id": "wamid.TEST",
                                    "timestamp": "1700000000",
                                    "text": {"body": text},
                                    "type": "text",
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }


def _sign(body: bytes, secret: str = APP_SECRET) -> str:
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


# ---------------------------------------------------------------------------
# GET /api/webhooks/whatsapp — verification
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_verify_webhook_success() -> None:
    """Valid token → 200 with hub.challenge body."""
    with patch("app.routers.webhooks.settings") as mock_settings:
        mock_settings.whatsapp_webhook_verify_token = VERIFY_TOKEN
        mock_settings.whatsapp_app_secret = APP_SECRET

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/webhooks/whatsapp",
                params={
                    "hub.mode": "subscribe",
                    "hub.verify_token": VERIFY_TOKEN,
                    "hub.challenge": "challenge_abc123",
                },
            )

    assert resp.status_code == 200
    assert resp.text == "challenge_abc123"


@pytest.mark.asyncio
async def test_verify_webhook_wrong_token() -> None:
    """Wrong token → 403."""
    with patch("app.routers.webhooks.settings") as mock_settings:
        mock_settings.whatsapp_webhook_verify_token = VERIFY_TOKEN

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/api/webhooks/whatsapp",
                params={
                    "hub.mode": "subscribe",
                    "hub.verify_token": "wrong-token",
                    "hub.challenge": "challenge_abc123",
                },
            )

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# POST /api/webhooks/whatsapp — inbound events
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_webhook_invalid_signature() -> None:
    """Bad signature → 403 before any processing."""
    with patch("app.routers.webhooks.settings") as mock_settings:
        mock_settings.whatsapp_app_secret = APP_SECRET

        payload = json.dumps(_make_meta_payload("48123456789", "hello")).encode()
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/webhooks/whatsapp",
                content=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-hub-signature-256": "sha256=badhash",
                },
            )

    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_post_webhook_valid_schedules_background() -> None:
    """Valid signed request → 200, background task scheduled."""
    payload_dict = _make_meta_payload("48123456789", "1")
    payload = json.dumps(payload_dict).encode()
    sig = _sign(payload)

    with (
        patch("app.routers.webhooks.settings") as mock_settings,
        patch("app.routers.webhooks._handle_inbound_message", new_callable=AsyncMock) as mock_handler,
    ):
        mock_settings.whatsapp_app_secret = APP_SECRET

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/webhooks/whatsapp",
                content=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-hub-signature-256": sig,
                },
            )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_post_webhook_non_message_object_ignored() -> None:
    """Non-whatsapp_business_account object returns 'ignored'."""
    payload = json.dumps({"object": "something_else"}).encode()
    sig = _sign(payload)

    with patch("app.routers.webhooks.settings") as mock_settings:
        mock_settings.whatsapp_app_secret = APP_SECRET

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/webhooks/whatsapp",
                content=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-hub-signature-256": sig,
                },
            )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored"}


# ---------------------------------------------------------------------------
# normalize_phone
# ---------------------------------------------------------------------------


def test_normalize_phone_strips_plus() -> None:
    assert normalize_phone("+48123456789") == "48123456789"


def test_normalize_phone_strips_spaces_dashes() -> None:
    assert normalize_phone("+48 123-456-789") == "48123456789"


def test_normalize_phone_already_normalized() -> None:
    assert normalize_phone("48123456789") == "48123456789"


def test_normalize_phone_ukrainian() -> None:
    assert normalize_phone("+380 99 123 45 67") == "380991234567"


# ---------------------------------------------------------------------------
# compute_score
# ---------------------------------------------------------------------------


def test_compute_score_max() -> None:
    """Best answers → score close to 100."""
    answers = {"experience": "4", "availability": "1", "relocation": "1"}
    score = compute_score(answers)
    assert score == 100


def test_compute_score_min() -> None:
    """Worst answers → score near 0."""
    answers = {"experience": "1", "availability": "4", "relocation": "3"}
    score = compute_score(answers)
    # 0.45*0 + 0.35*20 + 0.20*30 = 0 + 7 + 6 = 13
    assert score == 13


def test_compute_score_pass_threshold() -> None:
    """Mid-tier experience + fast availability should pass (≥ 70)."""
    answers = {"experience": "3", "availability": "1", "relocation": "2"}
    # 0.45*75 + 0.35*100 + 0.20*70 = 33.75 + 35 + 14 = 82.75 → 83
    score = compute_score(answers)
    assert score >= 70


def test_compute_score_web_form_availability() -> None:
    """web_form pre-seed for availability counts as 100."""
    answers = {"experience": "4", "availability": "web_form", "relocation": "1"}
    score = compute_score(answers)
    assert score == 100


def test_compute_score_missing_answers_default_low() -> None:
    """Missing answers fall back to lowest score for that dimension."""
    score = compute_score({})
    assert score < 30


# ---------------------------------------------------------------------------
# Locale / _t
# ---------------------------------------------------------------------------


def test_t_known_key_pl() -> None:
    msg = _t("pl", "experience_question")
    assert "doświadczenia" in msg


def test_t_known_key_en() -> None:
    msg = _t("en", "pass_message", first_name="Anna")
    assert "Anna" in msg
    assert "🎉" in msg


def test_t_fallback_to_english_on_unknown_lang() -> None:
    """Unknown language codes should fall back to English."""
    msg = _t("xx", "pass_message", first_name="Test")
    assert "Test" in msg


def test_t_missing_key_returns_key() -> None:
    """Missing keys return the key itself as fallback."""
    result = _t("en", "nonexistent_key_xyz")
    assert result == "nonexistent_key_xyz"


# ---------------------------------------------------------------------------
# Regression: no duplicate welcome after template_sent (EUR-624)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_template_sent_reply_has_no_welcome_known_language() -> None:
    """After template_sent with known language, bot reply must NOT contain the welcome text."""
    from app.services.chatbot_fsm import advance

    session = MagicMock()
    session.session_state = {
        "step": "template_sent",
        "next_step": "experience",
        "language": "en",
        "answers": {},
    }
    session.messages = []

    candidate = MagicMock()
    candidate.first_name = "Jan"

    db = AsyncMock()

    reply = await advance(session, candidate, "Hi", db)

    welcome_en = _t("en", "welcome", first_name="Jan")
    assert welcome_en not in reply
    assert _t("en", "experience_question") == reply


@pytest.mark.asyncio
async def test_template_sent_reply_has_no_welcome_for_each_locale() -> None:
    """No welcome prefix for any supported locale when language is already known."""
    from app.services.chatbot_fsm import advance

    for lang in ("pl", "en", "uk", "de", "ru"):
        session = MagicMock()
        session.session_state = {
            "step": "template_sent",
            "next_step": "experience",
            "language": lang,
            "answers": {},
        }
        session.messages = []

        candidate = MagicMock()
        candidate.first_name = "Ana"

        db = AsyncMock()

        reply = await advance(session, candidate, "start", db)

        welcome = _t(lang, "welcome", first_name="Ana")
        assert welcome not in reply, f"Duplicate welcome found for lang={lang}: {reply!r}"
