"""
WhatsApp Business API helper — Meta Graph API v19.0.

Sends text messages via the Cloud API endpoint:
    POST https://graph.facebook.com/v19.0/{phone_number_id}/messages

Configuration (env vars):
    WHATSAPP_PHONE_NUMBER_ID  — the registered business phone number ID
    WHATSAPP_ACCESS_TOKEN     — permanent / long-lived system user access token

The `to` parameter must be in E.164 format *without* the leading '+',
e.g. "48123456789".  The `from` field in incoming Meta webhooks already
arrives in this format, so you can pass it through directly.

Returns True on HTTP 2xx, False on any error (logs the detail).
Never raises — callers decide how to handle failures.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_GRAPH_API_BASE = "https://graph.facebook.com/v19.0"


async def send_whatsapp_message(to: str, body: str) -> bool:
    """
    Send a plain-text WhatsApp message to `to` (E.164 without '+').

    Returns True if Meta accepted the request (HTTP 200), False otherwise.
    """
    phone_number_id = settings.whatsapp_phone_number_id
    access_token = settings.whatsapp_access_token

    if not phone_number_id or not access_token:
        logger.warning(
            "[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not configured — "
            "message to %s skipped",
            to,
        )
        return False

    url = f"{_GRAPH_API_BASE}/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body, "preview_url": False},
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
        if response.is_success:
            return True
        logger.error(
            "[whatsapp] Meta API error %s for recipient %s: %s",
            response.status_code,
            to,
            response.text[:500],
        )
        return False
    except httpx.HTTPError as exc:
        logger.error("[whatsapp] HTTP error sending to %s: %s", to, exc)
        return False


def normalize_phone(phone: str) -> str:
    """
    Strip all non-digit characters from a phone number.

    Useful for comparing incoming Meta `from` numbers (already digit-only E.164
    without +) against stored candidate phone numbers that may include '+', spaces,
    or dashes (e.g. "+48 123 456 789" → "48123456789").
    """
    return "".join(ch for ch in phone if ch.isdigit())
