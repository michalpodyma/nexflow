"""
WhatsApp Business API helper — Meta Graph API v19.0.

Sends messages via the Cloud API endpoint:
    POST https://graph.facebook.com/v19.0/{phone_number_id}/messages

Configuration (env vars):
    WHATSAPP_PHONE_NUMBER_ID  — the registered business phone number ID
    WHATSAPP_ACCESS_TOKEN     — permanent / long-lived system user access token

The `to` parameter must be in E.164 format *without* the leading '+',
e.g. "48123456789".  The `from` field in incoming Meta webhooks already
arrives in this format, so you can pass it through directly.

send_whatsapp_message returns True on HTTP 2xx, False on any error.
send_whatsapp_template returns the Meta message id (wamid) on success, None on error.
Never raises — callers decide how to handle failures.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_GRAPH_API_BASE = "https://graph.facebook.com/v19.0"

_TEMPLATE_LANGUAGE_MAP = {
    "pl": "pl",
    "en": "en",
    "uk": "uk",
    "de": "de",
    "ru": "ru",
}


def _get_credentials() -> tuple[str, str] | None:
    phone_number_id = settings.whatsapp_phone_number_id
    access_token = settings.whatsapp_access_token
    if not phone_number_id or not access_token:
        return None
    return phone_number_id, access_token


async def _send(phone_number_id: str, access_token: str, to: str, payload: dict) -> str | None:
    """Return the wamid on success, None on failure."""
    url = f"{_GRAPH_API_BASE}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
        if response.is_success:
            data = response.json()
            return data.get("messages", [{}])[0].get("id")
        logger.error(
            "[whatsapp] Meta API error %s for recipient %s: %s",
            response.status_code,
            to,
            response.text[:500],
        )
        return None
    except httpx.HTTPError as exc:
        logger.error("[whatsapp] HTTP error sending to %s: %s", to, exc)
        return None


async def send_whatsapp_template(
    to: str,
    template_name: str,
    language_code: str,
    body_params: list[str] | None = None,
) -> str | None:
    """Send a pre-approved template message. Returns wamid on success, None on failure."""
    creds = _get_credentials()
    if creds is None:
        logger.warning("[whatsapp] credentials not configured — template to %s skipped", to)
        return None

    lang = _TEMPLATE_LANGUAGE_MAP.get(language_code, "en")
    payload: dict = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": lang},
        },
    }
    if body_params:
        payload["template"]["components"] = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": p} for p in body_params],
            }
        ]
    return await _send(*creds, to, payload)


async def send_whatsapp_message(to: str, body: str) -> bool:
    """
    Send a plain-text WhatsApp message to `to` (E.164 without '+').

    Only works within the 24-hour customer service window (after user replied).
    For business-initiated first contact, use send_whatsapp_template().
    """
    creds = _get_credentials()
    if creds is None:
        logger.warning(
            "[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not configured — "
            "message to %s skipped",
            to,
        )
        return False

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body, "preview_url": False},
    }
    return (await _send(*creds, to, payload)) is not None


def normalize_phone(phone: str) -> str:
    """
    Strip all non-digit characters from a phone number.

    Useful for comparing incoming Meta `from` numbers (already digit-only E.164
    without +) against stored candidate phone numbers that may include '+', spaces,
    or dashes (e.g. "+48 123 456 789" → "48123456789").
    """
    return "".join(ch for ch in phone if ch.isdigit())
