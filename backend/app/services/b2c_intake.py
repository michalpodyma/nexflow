"""
B2C WhatsApp candidate intake service.

Handles language detection, PII detection, ack text selection, and
Paperclip EUR-ticket creation for new inbound contacts from unknown numbers.

Config requirements:
  PAPERCLIP_API_URL          — defaults to https://app.paperclip.ing
  PAPERCLIP_BOT_API_KEY      — bearer token for Paperclip API (leave empty to disable)
  OPENROUTER_API_KEY         — bearer token for OpenRouter (leave empty to use keyword fallback)
  OPENROUTER_MODEL           — model slug (default: stepfun/step-3.5-flash:free)
"""

from __future__ import annotations

import json
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
        "Privacy notice: https://nexflow.work/en/privacy"
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
_OPENCLAW_AGENT_ID = "5864221d-6a66-42e7-a99c-5b0e9274b9ee"
_GOAL_ID = "b6976126-bb68-4311-8dc4-1902aa7ef9d4"

_CLASSIFY_SYSTEM_PROMPT = """\
You are a WhatsApp intake classifier for Nexflow, a Polish staffing agency that places \
EU-authorized temporary workers in Germany.

Classify each inbound WhatsApp message into exactly one policy_class:

- candidate: EU work authorization plausible from message content + phone context \
(EU phone prefix, or message gives no contrary signal)
- needs_decision: non-EU country code phone BUT message is written in a European language \
(pl, de, en, fr, uk, ru, cs, sk, ro, bg, nl, it, es, pt, sv, da, fi, hr, et, lv, lt, sl, hu). \
The person could be legally resident in EU or writing from their home country. Do NOT auto-decline.
- auto_decline_non_eu: non-EU phone prefix AND message language is non-European \
(Hindi, Urdu, Arabic, Bengali, Tagalog, etc.) OR message explicitly states the applicant \
is outside EU and seeking visa sponsorship
- auto_decline_b2b: business-to-business pitch, staffing agency cooperation request, \
competitor outreach, recruitment services offer
- auto_close_spam: bare URL with no context, bot-like / templated mass message, phishing attempt

Non-EU phone prefixes include: +91 (India), +92 (Pakistan), +213 (Algeria), +234 (Nigeria), \
+880 (Bangladesh), +63 (Philippines), +966 (Saudi Arabia), +971 (UAE), and other \
non-European country codes.

CRITICAL RULE: A non-EU phone with a message written in a European language → needs_decision, \
NOT auto_decline_non_eu. European message language takes priority for the auto_decline_non_eu gate.

For auto_decline_non_eu and auto_decline_b2b: generate drafted_reply in the same language \
as the message. Polite, 2-3 sentences.
  - non_eu reply: explain we only place EU work-authorized workers; invite to contact if \
situation changes.
  - b2b reply: explain this channel is for job candidates only; redirect to website for \
partnership inquiries.
For all other classes: drafted_reply must be null.

Detect message language. Return one of: pl, de, en, uk, ru, or other.

Respond ONLY with valid JSON:
{"language":"pl|de|en|uk|ru|other","policy_class":"candidate|needs_decision|auto_decline_non_eu|auto_decline_b2b|auto_close_spam","drafted_reply":"string or null","reasoning":"one sentence"}
"""


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


async def classify_inbound(text: str, phone: str) -> dict:
    """
    Returns {language, policy_class, drafted_reply, reasoning}
    Falls back to {language: detect_language(text), policy_class: "candidate", drafted_reply: None}
    if OpenRouter is unavailable or key not configured.
    """
    if not settings.openrouter_api_key:
        return {
            "language": detect_language(text),
            "policy_class": "candidate",
            "drafted_reply": None,
            "reasoning": "fallback: no openrouter key",
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openrouter_model,
                    "messages": [
                        {"role": "system", "content": _CLASSIFY_SYSTEM_PROMPT},
                        {"role": "user", "content": f"Phone: {phone}\nMessage: {text}"},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"]
            result = json.loads(raw)
            if "language" in result and "policy_class" in result:
                result.setdefault("drafted_reply", None)
                result.setdefault("reasoning", "")
                return result
            logger.warning("[b2c_intake] classify_inbound: unexpected schema in response")
    except Exception as exc:  # noqa: BLE001
        logger.warning("[b2c_intake] classify_inbound failed (%s), using keyword fallback", exc)

    return {
        "language": detect_language(text),
        "policy_class": "candidate",
        "drafted_reply": None,
        "reasoning": "fallback: openrouter error",
    }


async def create_intake_paperclip_issue(
    phone: str,
    candidate_id: str,
    message_text: str,
    wamid: str,
    language: str,
    has_pii: bool,
    pii_types: list[str],
    policy_class: str = "candidate",
    drafted_reply: str | None = None,
) -> str | None:
    """
    Create a Paperclip intake issue for a new B2C WhatsApp contact.

    De-duplicates by phone: if an open issue already exists for this number,
    appends a follow-up comment and returns the existing identifier.

    For auto_close_spam: callers should skip calling this function entirely.

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
            # De-dup check — phone appears verbatim in issue title
            search_resp = await client.get(
                issues_url,
                params={
                    "q": phone,
                    "status": "todo,in_progress,in_review",
                },
                headers=headers,
            )
            if search_resp.status_code == 200:
                results = search_resp.json()
                items = results if isinstance(results, list) else results.get("items", [])
                if items:
                    existing_id: str = items[0].get("identifier") or items[0].get("id", "")
                    existing_issue_id: str = items[0].get("id", existing_id)
                    logger.info(
                        "[b2c_intake] Duplicate — appending follow-up to %s for %s",
                        existing_id,
                        phone,
                    )
                    # Append follow-up comment to the existing issue
                    try:
                        await client.post(
                            f"{base_url}/api/issues/{existing_issue_id}/comments",
                            json={"body": f"**Follow-up message received:**\n\n> {message_text}"},
                            headers=headers,
                        )
                    except Exception as comment_exc:  # noqa: BLE001
                        logger.warning(
                            "[b2c_intake] Failed to post follow-up comment to %s: %s",
                            existing_id,
                            comment_exc,
                        )
                    return existing_id or None

            # Build policy classification section (shown first so SDR sees it immediately)
            policy_section = ""
            if policy_class not in ("candidate", "needs_decision"):
                reply_block = (
                    f"\n\n> {drafted_reply}" if drafted_reply else ""
                )
                policy_section = (
                    f"**Policy class:** {policy_class}  \n"
                    f"**Drafted reply:**{reply_block}\n\n---\n\n"
                )
            elif policy_class == "needs_decision":
                policy_section = (
                    f"**Policy class:** {policy_class}  \n\n---\n\n"
                )

            pii_flag = (
                "⚠️ PII DETECTED: " + ", ".join(pii_types) if has_pii else "None detected"
            )
            description = (
                f"{policy_section}"
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
                "assigneeAgentId": _OPENCLAW_AGENT_ID,
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

    except httpx.HTTPStatusError as exc:
        logger.warning(
            "[b2c_intake] Paperclip API returned HTTP %s for %s — issue queued for sweep retry",
            exc.response.status_code,
            phone,
        )
        return None
    except httpx.TimeoutException:
        logger.warning(
            "[b2c_intake] Paperclip API timed out for %s — issue queued for sweep retry",
            phone,
        )
        return None
    except Exception as exc:  # noqa: BLE001
        logger.exception("[b2c_intake] Unexpected error creating Paperclip issue for %s: %s", phone, exc)
        return None
