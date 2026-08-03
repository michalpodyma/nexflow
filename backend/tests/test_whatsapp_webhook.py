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
from app.services.chatbot_fsm import _t, compute_score
from app.services.whatsapp import normalize_phone

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
        patch("app.routers.webhooks._handle_inbound_message", new_callable=AsyncMock),
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


# ---------------------------------------------------------------------------
# EUR-711: WHATSAPP_AUTO_REPLY_ENABLED kill-switch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_auto_reply_disabled_tees_but_does_not_send() -> None:
    """With WHATSAPP_AUTO_REPLY_ENABLED=false: tee to inbox happens, no WhatsApp send, no FSM/LLM."""
    from app.routers import webhooks as webhooks_module

    candidate = MagicMock()
    candidate.id = "cand-1"
    candidate.chatbot_session_id = None

    db = AsyncMock()

    with (
        patch.object(webhooks_module, "settings") as mock_settings,
        patch.object(webhooks_module, "_resolve_candidate", new_callable=AsyncMock) as mock_resolve,
        patch.object(webhooks_module, "_tee_to_inbox", new_callable=AsyncMock) as mock_tee,
        patch.object(webhooks_module, "initiate_session", new_callable=AsyncMock) as mock_initiate,
        patch.object(webhooks_module, "advance", new_callable=AsyncMock) as mock_fsm_advance,
        patch.object(webhooks_module, "send_whatsapp_message", new_callable=AsyncMock) as mock_send,
    ):
        mock_settings.whatsapp_auto_reply_enabled = False
        mock_settings.whatsapp_screener_use_llm = False
        mock_resolve.return_value = candidate

        await webhooks_module._process_message("48123456789", "hello", "wamid.test.1", db)

    mock_tee.assert_awaited_once()
    mock_initiate.assert_not_called()
    mock_fsm_advance.assert_not_called()
    mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_auto_reply_enabled_runs_fsm_and_sends() -> None:
    """With WHATSAPP_AUTO_REPLY_ENABLED=true and an active session, FSM runs and reply is sent."""
    from app.routers import webhooks as webhooks_module

    candidate = MagicMock()
    candidate.id = "cand-1"
    candidate.chatbot_session_id = "sess-1"

    active_session = MagicMock()
    active_session.completed_at = None

    db = AsyncMock()
    scalar_result = MagicMock()
    scalar_result.scalar_one_or_none.return_value = active_session
    db.execute = AsyncMock(return_value=scalar_result)

    with (
        patch.object(webhooks_module, "settings") as mock_settings,
        patch.object(webhooks_module, "_resolve_candidate", new_callable=AsyncMock) as mock_resolve,
        patch.object(webhooks_module, "_tee_to_inbox", new_callable=AsyncMock) as mock_tee,
        patch.object(webhooks_module, "advance", new_callable=AsyncMock) as mock_fsm_advance,
        patch.object(webhooks_module, "send_whatsapp_message", new_callable=AsyncMock) as mock_send,
    ):
        mock_settings.whatsapp_auto_reply_enabled = True
        mock_settings.whatsapp_screener_use_llm = False
        mock_resolve.return_value = candidate
        mock_fsm_advance.return_value = "Next question?"

        await webhooks_module._process_message("48123456789", "hello", "wamid.test.1", db)

    mock_tee.assert_awaited_once()
    mock_fsm_advance.assert_awaited_once()
    mock_send.assert_awaited_once()
    sent_to, sent_body = mock_send.await_args.args
    assert sent_to == "48123456789"
    assert sent_body == "Next question?"
