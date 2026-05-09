"""
WhatsApp webhook — Meta Graph API.

Endpoints
─────────
GET  /api/webhooks/whatsapp  — Meta verification challenge (hub.challenge)
POST /api/webhooks/whatsapp  — Incoming message events (X-Hub-Signature-256)

Meta sends ALL event types to the same POST endpoint.  We process only
"messages" change-field events and silently ack everything else (status
updates, read receipts, etc.) with HTTP 200 so Meta doesn't retry them.

Signature validation
────────────────────
Every POST is signed with HMAC-SHA256 using the app secret:
    X-Hub-Signature-256: sha256=<hex>
We validate before any processing.  Set WHATSAPP_APP_SECRET in Railway.
Signature validation is skipped in development if the secret is empty
(for local testing with ngrok/tunnels), but a warning is logged.

Phone matching
──────────────
Meta sends phone numbers in E.164 format *without* the '+' (e.g. "48123456789").
We normalise stored candidate.phone the same way and match on equality.
If no candidate matches we create a skeleton candidate so the flow can run.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.candidates import Candidate
from app.models.chatbot import ChatbotSession
from app.models.enums import ChatbotChannel, ScreeningStatus
from app.models.whatsapp_inbox import WhatsAppInboxEvent
from app.services.chatbot_fsm import advance, initiate_session
from app.services.whatsapp import normalize_phone, send_whatsapp_message

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _verify_signature(body: bytes, signature_header: str) -> bool:
    """Return True if the request passes X-Hub-Signature-256 validation."""
    app_secret = settings.whatsapp_app_secret
    if not app_secret:
        logger.warning(
            "[whatsapp_webhook] WHATSAPP_APP_SECRET not set — skipping signature check"
        )
        return True  # dev / testing only

    if not signature_header.startswith("sha256="):
        return False

    expected = "sha256=" + hmac.new(
        app_secret.encode("utf-8"), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature_header, expected)


async def _resolve_candidate(from_phone: str, db: AsyncSession) -> Candidate:
    """
    Find a Candidate by normalised phone number, or create a skeleton record
    so the FSM can run even for numbers not yet in the system.

    We normalise both the incoming phone (already digit-only E.164 without '+')
    and the stored phone by stripping all non-digit characters.  Two candidates
    can't share the same normalised phone in practice, so we take the first match.
    """
    normalised = normalize_phone(from_phone)

    # Fetch only candidates that have a phone set and filter in Python to avoid
    # a case-insensitive regex query across the full table.
    # Candidates table is typically small (< 50k rows in Phase 1), so this is fine;
    # a future migration can add a normalised_phone generated column with an index.
    result = await db.execute(
        select(Candidate).where(Candidate.phone.isnot(None))
    )
    candidates = result.scalars().all()

    for cand in candidates:
        if normalize_phone(cand.phone) == normalised:  # type: ignore[arg-type]
            return cand

    # Unknown number — create skeleton candidate
    new_cand = Candidate(
        first_name="WhatsApp",
        last_name="User",
        phone="+" + normalised,
        gdpr_consent=False,  # will need to be collected separately
        screening_status=ScreeningStatus.new,
    )
    db.add(new_cand)
    await db.flush()
    await db.refresh(new_cand)
    logger.info(
        "[whatsapp_webhook] Created skeleton candidate %s for unknown phone %s",
        new_cand.id,
        normalised,
    )
    return new_cand


async def _handle_inbound_message(
    from_phone: str,
    text: str,
) -> None:
    """Core processing logic — called in background with its own DB session."""
    async with AsyncSessionLocal() as db:
        await _process_message(from_phone, text, db)


async def _tee_to_inbox(
    from_phone: str, text: str, candidate_id: object, db: AsyncSession
) -> None:
    """Write inbound message to the OpenClaw inbox table (fire-and-forget within session)."""
    masked = normalize_phone(from_phone)[-4:] or "????"
    event = WhatsAppInboxEvent(
        candidate_id=candidate_id,  # type: ignore[arg-type]
        from_phone_masked=masked,
        message_text=text,
    )
    db.add(event)
    # Flushed as part of the outer transaction; no separate commit needed here.


async def _process_message(from_phone: str, text: str, db: AsyncSession) -> None:
    """Process a single inbound WhatsApp message within an existing session."""
    try:
        candidate = await _resolve_candidate(from_phone, db)

        # Mirror every inbound message to the OpenClaw inbox (tee — FSM unaffected)
        try:
            await _tee_to_inbox(from_phone, text, candidate.id, db)
        except Exception as tee_exc:  # noqa: BLE001
            logger.exception("[whatsapp_webhook] Tee to inbox failed (non-fatal): %s", tee_exc)

        # Find active (incomplete) session
        session: ChatbotSession | None = None
        if candidate.chatbot_session_id:
            result = await db.execute(
                select(ChatbotSession).where(
                    ChatbotSession.id == candidate.chatbot_session_id,
                    ChatbotSession.completed_at.is_(None),
                )
            )
            session = result.scalar_one_or_none()

        if session is None:
            # No active session — start one
            session = await initiate_session(candidate, db, channel=ChatbotChannel.whatsapp)
            if session is None:
                # Candidate already screened or has no phone (shouldn't happen here)
                normalised = normalize_phone(from_phone)
                lang = "en"
                if candidate.languages:
                    lang = str(candidate.languages[0]).lower() if candidate.languages else "en"
                from app.services.chatbot_fsm import _t  # noqa: PLC0415
                msg = _t(lang, "already_screened")
                await send_whatsapp_message(normalised, msg)
            return

        # Advance screener — LLM path when flag is enabled, FSM otherwise
        if settings.whatsapp_screener_use_llm:
            from app.services.llm_screener import advance as llm_advance  # noqa: PLC0415
            reply = await llm_advance(session, candidate, text, db)
        else:
            reply = await advance(session, candidate, text, db)
        normalised = normalize_phone(from_phone)
        await send_whatsapp_message(normalised, reply)

    except Exception as exc:  # noqa: BLE001
        logger.exception("[whatsapp_webhook] Unhandled error processing message from %s: %s", from_phone, exc)


# ---------------------------------------------------------------------------
# GET — Meta verification
# ---------------------------------------------------------------------------


@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
) -> Response:
    """
    Meta webhook verification handshake.

    Meta sends:  GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
    We must respond with the challenge value (plain text) if the token matches.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_webhook_verify_token:
        logger.info("[whatsapp_webhook] Verification successful")
        return Response(content=hub_challenge or "", media_type="text/plain")

    logger.warning(
        "[whatsapp_webhook] Verification failed — mode=%s token_match=%s",
        hub_mode,
        hub_verify_token == settings.whatsapp_webhook_verify_token,
    )
    raise HTTPException(status_code=403, detail="Webhook verification failed")


# ---------------------------------------------------------------------------
# POST — Inbound events
# ---------------------------------------------------------------------------


@router.post("/whatsapp", status_code=200)
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """
    Receive and process inbound WhatsApp message events from Meta.

    Meta expects HTTP 200 within 20 seconds; all heavy work runs in background.
    Non-message events (status updates, read receipts) are acked and dropped.
    """
    body = await request.body()

    # Signature check
    sig = request.headers.get("x-hub-signature-256", "")
    if not _verify_signature(body, sig):
        logger.warning("[whatsapp_webhook] Invalid X-Hub-Signature-256")
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload: dict[str, Any] = await request.json()

    if payload.get("object") != "whatsapp_business_account":
        return {"status": "ignored"}

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") != "messages":
                continue
            value: dict = change.get("value", {})
            for message in value.get("messages", []):
                if message.get("type") != "text":
                    # Ignore media, reactions, etc. for now
                    continue
                from_phone: str = message.get("from", "")
                text: str = (message.get("text") or {}).get("body", "").strip()
                if not from_phone or not text:
                    continue

                background_tasks.add_task(_handle_inbound_message, from_phone, text)

    return {"status": "ok"}
