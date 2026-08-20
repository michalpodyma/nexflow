"""
Webhook endpoints — WhatsApp (Meta Graph API) and ElevenLabs post-call (EUR-1575).

Endpoints
─────────
GET  /api/webhooks/whatsapp                      — Meta verification challenge
POST /api/webhooks/whatsapp                      — Inbound WhatsApp events (X-Hub-Signature-256)
POST /api/webhooks/elevenlabs/conversation-end   — ElevenLabs post-call webhook (HMAC-SHA256)

WhatsApp signature validation
─────────────────────────────
Every POST is signed with HMAC-SHA256 using the app secret:
    X-Hub-Signature-256: sha256=<hex>
Set WHATSAPP_APP_SECRET in Railway.  Skipped in dev if the secret is empty.

ElevenLabs signature validation
────────────────────────────────
ElevenLabs sends:  ElevenLabs-Signature: t=<timestamp>,v0=<hex>
Signed string: "{timestamp}.{raw_body}".  Secret: ELEVENLABS_WEBHOOK_SECRET.
Set that env var in Railway after pasting the same value into ElevenLabs dashboard.

Phone matching (WhatsApp)
─────────────────────────
Meta sends phone numbers in E.164 without '+' (e.g. "48123456789").
We normalise stored candidate.phone the same way and match on equality.
If no candidate matches we create a skeleton candidate so the flow can run.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.candidates import Candidate
from app.models.chatbot import ChatbotSession
from app.models.elevenlabs_conversation import ElevenLabsConversation
from app.models.enums import (
    ChatbotChannel,
    ConversationIntent,
    HRappkaSyncStatus,
    ScreeningStatus,
)
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
    wamid: str = "",
) -> None:
    """Core processing logic — called in background with its own DB session."""
    async with AsyncSessionLocal() as db:
        await _process_message(from_phone, text, wamid, db)


async def _tee_to_inbox(
    from_phone: str, text: str, candidate_id: object, db: AsyncSession
) -> WhatsAppInboxEvent:
    """Write inbound message to the OpenClaw inbox table (fire-and-forget within session)."""
    masked = normalize_phone(from_phone)[-4:] or "????"
    event = WhatsAppInboxEvent(
        candidate_id=candidate_id,  # type: ignore[arg-type]
        from_phone_masked=masked,
        message_text=text,
    )
    db.add(event)
    # Flushed as part of the outer transaction; no separate commit needed here.
    return event


async def _process_message(from_phone: str, text: str, wamid: str, db: AsyncSession) -> None:
    """Process a single inbound WhatsApp message within an existing session."""
    try:
        candidate = await _resolve_candidate(from_phone, db)

        # Mirror every inbound message to the OpenClaw inbox (tee — listener path,
        # always on so OpenClaw can observe inbound conversation regardless of
        # which responder owns the WhatsApp number).
        event: WhatsAppInboxEvent | None = None
        try:
            event = await _tee_to_inbox(from_phone, text, candidate.id, db)
        except Exception as tee_exc:  # noqa: BLE001
            logger.exception("[whatsapp_webhook] Tee to inbox failed (non-fatal): %s", tee_exc)

        # B2C candidate intake — fires regardless of auto-reply kill-switch.
        # Only triggers for brand-new contacts (screening_status=new, no active session).
        if (
            candidate.screening_status == ScreeningStatus.new
            and candidate.chatbot_session_id is None
            and settings.paperclip_bot_api_key
        ):
            from app.services.b2c_intake import (  # noqa: PLC0415
                create_intake_paperclip_issue,
                detect_language,
                detect_pii,
                get_b2c_ack_text,
            )

            lang = detect_language(text)
            has_pii, pii_types = detect_pii(text)
            ack = get_b2c_ack_text(lang)
            normalised_phone = normalize_phone(from_phone)
            try:
                await send_whatsapp_message(normalised_phone, ack)
            except Exception as ack_exc:  # noqa: BLE001
                logger.exception("[whatsapp_webhook] B2C ack send failed: %s", ack_exc)
            # Ack the inbox event immediately — Paperclip creation is best-effort.
            if event:
                event.acknowledged_at = datetime.now(tz=UTC)
            try:
                issue_id = await create_intake_paperclip_issue(
                    phone="+" + normalised_phone,
                    candidate_id=str(candidate.id),
                    message_text=text,
                    wamid=wamid,
                    language=lang,
                    has_pii=has_pii,
                    pii_types=pii_types,
                )
                if issue_id and event:
                    event.paperclip_issue_id = issue_id
            except Exception as pp_exc:  # noqa: BLE001
                logger.exception(
                    "[whatsapp_webhook] Paperclip intake issue creation failed: %s", pp_exc
                )
            await db.commit()
            return  # Do NOT run B2B screener for B2C contacts

        # EUR-711: ElevenLabs is the WhatsApp responder. The backend's
        # FSM / LLM screener and any auto-replies are gated behind a kill-switch
        # so they don't overlap with ElevenLabs. We still tee to the inbox above
        # so OpenClaw can listen.
        if not settings.whatsapp_auto_reply_enabled:
            logger.info(
                "[whatsapp_webhook] Auto-reply disabled (WHATSAPP_AUTO_REPLY_ENABLED=false) — "
                "listened to message from %s; ElevenLabs owns the response",
                from_phone,
            )
            await db.commit()
            return

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
                wamid: str = message.get("id", "")
                from_phone: str = message.get("from", "")
                text: str = (message.get("text") or {}).get("body", "").strip()
                if not from_phone or not text:
                    continue

                background_tasks.add_task(_handle_inbound_message, from_phone, text, wamid)

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# ElevenLabs post-call webhook (EUR-1575)
# ---------------------------------------------------------------------------


def _verify_elevenlabs_signature(body: bytes, signature_header: str) -> bool:
    """
    Validate ElevenLabs-Signature header.

    Format: "t=<unix_timestamp>,v0=<hex_digest>"
    Signed string: "{timestamp}.{raw_body_bytes}"
    """
    secret = settings.elevenlabs_webhook_secret
    if not secret:
        logger.warning(
            "[elevenlabs_webhook] ELEVENLABS_WEBHOOK_SECRET not set — skipping signature check"
        )
        return True  # dev / testing only

    parts: dict[str, str] = {}
    for segment in signature_header.split(","):
        if "=" in segment:
            k, _, v = segment.partition("=")
            parts[k.strip()] = v.strip()

    timestamp = parts.get("t", "")
    received_sig = parts.get("v0", "")
    if not timestamp or not received_sig:
        logger.warning("[elevenlabs_webhook] Malformed ElevenLabs-Signature header")
        return False

    signed_payload = f"{timestamp}.".encode() + body
    expected = hmac.new(
        secret.encode("utf-8"), signed_payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, received_sig)


def _extract_intent(evaluation_results: dict[str, Any]) -> ConversationIntent:
    """
    Read the `intent` field from ElevenLabs Data Collection results.

    ElevenLabs wraps each collected field as {"value": ..., "rationale": ...}
    under data_collection_results.
    """
    collected = evaluation_results.get("data_collection_results", {})
    raw = collected.get("intent")
    if isinstance(raw, dict):
        raw = raw.get("value")
    if isinstance(raw, str):
        try:
            return ConversationIntent(raw.strip().lower())
        except ValueError:
            pass
    return ConversationIntent.other


def _extract_client_fields(evaluation_results: dict[str, Any]) -> dict[str, str | None]:
    """Pull client contact fields out of ElevenLabs data_collection_results."""
    collected = evaluation_results.get("data_collection_results", {})

    def _val(key: str) -> str | None:
        entry = collected.get(key)
        if entry is None:
            return None
        if isinstance(entry, dict):
            return entry.get("value") or None
        return str(entry) if entry else None

    return {
        "company_name": _val("company_name"),
        "nip": _val("nip"),
        "email": _val("contact_email"),
        "phone": _val("contact_phone"),
        "address": _val("address"),
        "city": _val("city"),
        "postal_code": _val("postal_code"),
        "country": _val("country"),
    }


async def _sync_client_to_hrappka(conversation_id: str) -> None:
    """
    Background task: create a Client row from conversation data and push to HRappka.

    Runs in its own DB session so the webhook handler returns immediately.
    """
    from app.models.clients import Client  # noqa: PLC0415
    from app.models.enums import Currency  # noqa: PLC0415
    from app.services.hrappka_sync.clients import push_client_to_hrappka  # noqa: PLC0415

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ElevenLabsConversation).where(
                ElevenLabsConversation.id == conversation_id
            )
        )
        conv = result.scalar_one_or_none()
        if conv is None:
            logger.error(
                "[elevenlabs_webhook] sync_client: conversation %s not found", conversation_id
            )
            return

        evaluation = conv.evaluation_results_json or {}
        fields = _extract_client_fields(evaluation)

        company_name = fields.get("company_name") or "Unknown (ElevenLabs)"
        try:
            client = Client(
                company_name=company_name,
                nip=fields.get("nip"),
                email=fields.get("email"),
                phone=fields.get("phone"),
                address=fields.get("address"),
                city=fields.get("city"),
                postal_code=fields.get("postal_code"),
                country=(fields.get("country") or "PL")[:2],
                currency=Currency.PLN,
            )
            db.add(client)
            await db.flush()
            await db.refresh(client)

            contractor_id = await push_client_to_hrappka(client.id, db)
            conv.hrappka_sync_status = HRappkaSyncStatus.synced
            conv.hrappka_target_id = contractor_id
            logger.info(
                "[elevenlabs_webhook] Client synced to HRappka: conv=%s hrappka_id=%s",
                conversation_id,
                contractor_id,
            )
        except Exception as exc:  # noqa: BLE001
            conv.hrappka_sync_status = HRappkaSyncStatus.failed
            conv.hrappka_sync_error = str(exc)[:500]
            logger.exception(
                "[elevenlabs_webhook] HRappka sync failed for conv=%s: %s",
                conversation_id,
                exc,
            )

        await db.commit()


@router.post("/elevenlabs/conversation-end", status_code=200)
async def elevenlabs_conversation_end(
    request: Request,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """
    ElevenLabs post-call webhook — persists conversation data and
    triggers HRappka client import for client_inquiry intents.

    Must ack within 2 s; all heavy work runs in BackgroundTasks.
    """
    body = await request.body()

    sig = request.headers.get("elevenlabs-signature", "")
    if not _verify_elevenlabs_signature(body, sig):
        logger.warning("[elevenlabs_webhook] Invalid ElevenLabs-Signature")
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload: dict[str, Any] = await request.json()

    # Support both direct payload shape and wrapped {"type": ..., "data": {...}}
    data: dict[str, Any] = payload.get("data", payload)

    conversation_id: str = data.get("conversation_id", "")
    if not conversation_id:
        logger.warning("[elevenlabs_webhook] Missing conversation_id in payload")
        raise HTTPException(status_code=422, detail="Missing conversation_id")

    agent_id: str = data.get("agent_id", "")
    metadata: dict[str, Any] = data.get("metadata", {})
    analysis: dict[str, Any] = data.get("analysis", {})

    wa_phone: str | None = metadata.get("phone_number") or None
    start_ts: int | None = metadata.get("start_time_unix_secs")
    duration: int | None = metadata.get("call_duration_secs")

    started_at: datetime | None = None
    ended_at: datetime | None = None
    if start_ts is not None:
        started_at = datetime.fromtimestamp(start_ts, tz=UTC)
        if duration is not None:
            ended_at = started_at + timedelta(seconds=duration)

    evaluation_results: dict[str, Any] = analysis.get("evaluation_criteria_results") or {}
    # ElevenLabs places data_collection_results inside analysis
    data_collection: dict[str, Any] = analysis.get("data_collection_results") or {}
    # Merge both so _extract_intent and build_contractor_payload have a unified dict
    merged_evaluation = {
        **evaluation_results,
        "data_collection_results": data_collection,
    }

    intent = _extract_intent(merged_evaluation)
    summary = analysis.get("transcript_summary") or None
    transcript = data.get("transcript")

    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(ElevenLabsConversation).where(
                ElevenLabsConversation.id == conversation_id
            )
        )
        if existing.scalar_one_or_none() is not None:
            logger.info(
                "[elevenlabs_webhook] Duplicate delivery for conv=%s — acked", conversation_id
            )
            return {"status": "ok", "note": "duplicate"}

        # Determine initial HRappka sync status
        if intent == ConversationIntent.client_inquiry:
            initial_hrappka = HRappkaSyncStatus.pending
        else:
            initial_hrappka = HRappkaSyncStatus.skipped

        conv = ElevenLabsConversation(
            id=conversation_id,
            wa_phone_number=wa_phone,
            agent_id=agent_id or None,
            started_at=started_at,
            ended_at=ended_at,
            duration_seconds=duration,
            transcript_json=transcript if isinstance(transcript, (dict, list)) else None,
            summary_text=summary,
            evaluation_results_json=merged_evaluation,
            intent=intent,
            hrappka_sync_status=initial_hrappka,
        )
        db.add(conv)
        await db.commit()

        logger.info(
            "[elevenlabs_webhook] Saved conv=%s intent=%s phone=%s",
            conversation_id,
            intent.value,
            wa_phone,
        )

    if intent == ConversationIntent.client_inquiry:
        background_tasks.add_task(_sync_client_to_hrappka, conversation_id)

    return {"status": "ok"}
