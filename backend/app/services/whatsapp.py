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

Raises WhatsAppConfigError when credentials are missing.
Raises WhatsAppAPIError when Meta returns a non-2xx response.
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


class WhatsAppConfigError(Exception):
    """Raised when WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set."""


class WhatsAppAPIError(Exception):
    """Raised when Meta Graph API returns a non-2xx response."""

    def __init__(self, status_code: int, body: str) -> None:
        self.status_code = status_code
        self.body = body
        super().__init__(f"Meta API {status_code}: {body}")


def _get_credentials() -> tuple[str, str]:
    phone_number_id = settings.whatsapp_phone_number_id
    access_token = settings.whatsapp_access_token
    if not phone_number_id or not access_token:
        raise WhatsAppConfigError("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not configured")
    return phone_number_id, access_token


async def _send(phone_number_id: str, access_token: str, to: str, payload: dict) -> str:
    """Return the wamid on success. Raises WhatsAppAPIError on non-2xx."""
    url = f"{_GRAPH_API_BASE}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=payload, headers=headers)
    if response.is_success:
        data = response.json()
        return data.get("messages", [{}])[0].get("id", "")
    logger.error(
        "[whatsapp] Meta API error %s for recipient %s: %s",
        response.status_code,
        to,
        response.text[:500],
    )
    raise WhatsAppAPIError(response.status_code, response.text[:500])


async def send_whatsapp_template(
    to: str,
    template_name: str,
    language_code: str,
    body_params: list[str] | None = None,
) -> str:
    """Send a pre-approved template message. Returns wamid on success.

    Raises:
        WhatsAppConfigError: credentials not set in environment.
        WhatsAppAPIError: Meta returned a non-2xx response.
    """
    creds = _get_credentials()

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

    Raises:
        WhatsAppConfigError: credentials not set in environment.
        WhatsAppAPIError: Meta returned a non-2xx response.
    """
    creds = _get_credentials()
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": body, "preview_url": False},
    }
    return bool(await _send(*creds, to, payload))


def normalize_phone(phone: str) -> str:
    """
    Strip all non-digit characters from a phone number.

    Useful for comparing incoming Meta `from` numbers (already digit-only E.164
    without +) against stored candidate phone numbers that may include '+', spaces,
    or dashes (e.g. "+48 123 456 789" → "48123456789").
    """
    return "".join(ch for ch in phone if ch.isdigit())
