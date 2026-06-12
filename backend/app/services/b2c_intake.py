"""
B2C WhatsApp candidate intake service.

Handles language detection, PII detection, ack text selection, and
Paperclip EUR-ticket creation for new inbound contacts from unknown numbers.

Config requirements:
  PAPERCLIP_API_URL          — defaults to https://app.paperclip.ing
  PAPERCLIP_BOT_API_KEY      — bearer token for Paperclip API (leave empty to disable)
"""

from __future__ import annotations

import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Approved B2C auto-reply copy (EUR-1964)
# ---------------------------------------------------------------------------

B2C_ACK: dict[str, str] = {
    "pl": (
        "Dzień dobry! Dziękujemy za kontakt z Nexflow. Twoja wiadomość dotarła do naszego "
        "zespołu rekrutacji. Odpiszemy w ciągu 24 godzin roboczych. "
        "Polityka prywatności: https://nexflow.work/polityka-prywatnosci"
    ),
    "de": (
        "Guten Tag! Vielen Dank für Ihre Kontaktaufnahme mit Nexflow. Ihre Nachricht ist bei "
        "unserem Recruiting-Team eingegangen. Wir melden uns innerhalb von 24 Arbeitsstunden. "
        "Datenschutzerklärung: https://nexflow.work/datenschutz"
    ),
    "en": (
        "Hello! Thank you for contacting Nexflow. Your message has been received by our "
        "recruitment team. We will reply within 24 business hours. "
        "Privacy notice: https://nexflow.work/polityka-prywatnosci"
    ),
}

_PL_KEYWORDS = {
    "praca", "szukam", "proszę", "dziękuję", "dobry",
    "oferta", "zatrudni", "jestem", "chciałbym", "chciałabym",
}
_DE_KEYWORDS = {
    "arbeit", "suche", "stelle", "danke", "guten",
    "bitte", "bewerbung", "ich", "mich",
}

_PESEL_RE = re.compile(r"\b\d{11}\b")
_ID_CARD_RE = re.compile(r"\b[A-Z]{2}\d{7}\b")

_COMPANY_ID = "679a5f1a-b4bf-46ad-b414-09a0ee02bf78"
_CMO_AGENT_ID = "c3603c44-a0d3-49e0-8fa5-776eaa20b945"
_GOAL_ID = "b6976126-bb68-4311-8dc4-1902aa7ef9d4"


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def detect_language(text: str) -> str:
    """Return 'pl', 'de', or 'en'. Defaults to 'pl' when no match."""
    lower = text.lower()
    words = set(re.findall(r"[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+", lower))

    de_hits = len(words & _DE_KEYWORDS)
    pl_hits = len(words & _PL_KEYWORDS)

    if de_hits > pl_hits and de_hits > 0:
        return "de"
    if pl_hits > 0:
        return "pl"
    # Check for English-only characters (no PL/DE-specific unicode) as fallback
    if words and not any(ch in lower for ch in "ąćęłńóśźżüöäß"):
        return "en"
    return "pl"


def detect_pii(text: str) -> tuple[bool, list[str]]:
    """
    Returns (has_pii, pii_types).

    pii_types values: 'pesel', 'id_card'
    """
    found: list[str] = []
    if _PESEL_RE.search(text):
        found.append("pesel")
    if _ID_CARD_RE.search(text):
        found.append("id_card")
    return bool(found), found


def get_b2c_ack_text(language: str) -> str:
    """Return approved ack copy for the given language; falls back to 'pl'."""
    return B2C_ACK.get(language, B2C_ACK["pl"])


async def create_intake_paperclip_issue(
    phone: str,
    candidate_id: str,
    message_text: str,
    wamid: str,
    language: str,
    has_pii: bool,
    pii_types: list[str],
) -> str | None:
    """
    Create a Paperclip intake issue for a new B2C WhatsApp contact.

    De-duplicates by phone: if an open issue already exists for this number
    the existing identifier is returned without creating a new one.

    Returns the issue identifier (e.g. 'EUR-1234') or None on failure.
    """
    if not settings.paperclip_bot_api_key:
        logger.debug("[b2c_intake] PAPERCLIP_BOT_API_KEY not set — skipping issue creation")
        return None

    headers = {
        "Authorization": f"Bearer {settings.paperclip_bot_api_key}",
        "Content-Type": "application/json",
    }
    base_url = settings.paperclip_api_url.rstrip("/")
    issues_url = f"{base_url}/api/companies/{_COMPANY_ID}/issues"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # De-dup check
            search_resp = await client.get(
                issues_url,
                params={
                    "q": f"whatsapp_candidate_intake {phone}",
                    "status": "todo,in_progress,in_review",
                },
                headers=headers,
            )
            if search_resp.status_code == 200:
                results = search_resp.json()
                items = results if isinstance(results, list) else results.get("items", [])
                if items:
                    existing_id: str = items[0].get("identifier") or items[0].get("id", "")
                    logger.info(
                        "[b2c_intake] Duplicate suppressed — open issue %s exists for %s",
                        existing_id,
                        phone,
                    )
                    return existing_id or None

            # Build description
            pii_flag = (
                "⚠️ PII DETECTED: " + ", ".join(pii_types) if has_pii else "None detected"
            )
            description = (
                f"**Phone:** {phone}  \n"
                f"**Language detected:** {language}  \n"
                f"**GDPR/PII flag:** {pii_flag}  \n"
                f"**Candidate ID (nexflow):** {candidate_id}  \n"
                "\n---\n\n"
                "**Original message:**\n\n"
                f"> {message_text}"
            )

            payload = {
                "title": f"WhatsApp candidate intake — {phone}",
                "description": description,
                "priority": "critical" if has_pii else "high",
                "assigneeAgentId": _CMO_AGENT_ID,
                "goalId": _GOAL_ID,
                "originKind": "whatsapp_candidate_intake",
                "originId": wamid,
            }

            create_resp = await client.post(issues_url, json=payload, headers=headers)
            create_resp.raise_for_status()
            data = create_resp.json()
            issue_id: str = data.get("identifier") or data.get("id", "")
            logger.info("[b2c_intake] Created intake issue %s for %s", issue_id, phone)
            return issue_id or None

    except Exception as exc:  # noqa: BLE001
        logger.exception("[b2c_intake] Failed to create Paperclip issue for %s: %s", phone, exc)
        return None
