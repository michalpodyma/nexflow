"""
Transactional notification dispatch — email (SendGrid) and SMS (Twilio).

All functions are synchronous so they can be called directly from Celery tasks.
Each returns True if the provider accepted the request, False on failure.
Failures are logged but not raised — callers decide how to handle them.

Configuration (via env vars / settings):
    SENDGRID_API_KEY      — SendGrid API key
    SENDGRID_FROM_EMAIL   — verified sender address (default noreply@nexflow.work)
    TWILIO_ACCOUNT_SID    — Twilio account SID
    TWILIO_AUTH_TOKEN     — Twilio auth token
    TWILIO_FROM_NUMBER    — Twilio sender number (E.164)

If a provider is not configured (empty key/sid), the function logs a warning and
returns False without raising.
"""

import logging
from dataclasses import dataclass

from app.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Template helpers
# ---------------------------------------------------------------------------


@dataclass
class EmailMessage:
    to: str
    subject: str
    html: str
    text: str


def _render_welcome_candidate(first_name: str) -> EmailMessage:
    subject = "Witaj w Nexflow – Twoja rejestracja została przyjęta"
    text = (
        f"Cześć {first_name},\n\n"
        "Dziękujemy za rejestrację. Nasz rekruter skontaktuje się z Tobą wkrótce.\n\n"
        "Pozdrawiamy,\nZespół Nexflow"
    )
    html = (
        f"<p>Cześć <strong>{first_name}</strong>,</p>"
        "<p>Dziękujemy za rejestrację. Nasz rekruter skontaktuje się z Tobą wkrótce.</p>"
        "<p>Pozdrawiamy,<br>Zespół Nexflow</p>"
    )
    return EmailMessage(to="", subject=subject, html=html, text=text)


def _render_compliance_expiry(
    first_name: str,
    last_name: str,
    alert_type: str,
    due_date_str: str,
    days_remaining: int,
) -> EmailMessage:
    doc_labels: dict[str, str] = {
        "health_cert_expiry": "badanie lekarskie",
        "bhp_cert_expiry": "szkolenie BHP",
        "a1_cert_expiry": "certyfikat A1",
        "contract_expiry": "umowa o pracę",
        "deployment_limit_warning": "limit delegowania (18 mies.)",
    }
    doc_label = doc_labels.get(alert_type, alert_type)
    subject = f"Nexflow: {doc_label} wygasa za {days_remaining} dni — {first_name} {last_name}"
    text = (
        f"Uwaga,\n\n"
        f"Dokument pracownika {first_name} {last_name} wymaga odnowienia:\n"
        f"  Typ: {doc_label}\n"
        f"  Data ważności: {due_date_str}\n"
        f"  Pozostało dni: {days_remaining}\n\n"
        "Proszę podjąć działania przed upływem terminu.\n\n"
        "Pozdrawiamy,\nSystem Nexflow"
    )
    html = (
        f"<p>Uwaga,</p>"
        f"<p>Dokument pracownika <strong>{first_name} {last_name}</strong> wymaga odnowienia:</p>"
        f"<ul>"
        f"<li><strong>Typ:</strong> {doc_label}</li>"
        f"<li><strong>Data ważności:</strong> {due_date_str}</li>"
        f"<li><strong>Pozostało dni:</strong> {days_remaining}</li>"
        f"</ul>"
        "<p>Proszę podjąć działania przed upływem terminu.</p>"
        "<p>Pozdrawiamy,<br>System Nexflow</p>"
    )
    return EmailMessage(to="", subject=subject, html=html, text=text)


def _render_invoice_sent(
    client_name: str,
    invoice_number: str,
    gross_amount: str,
    currency: str,
    due_date_str: str,
) -> EmailMessage:
    subject = f"Nexflow: Faktura {invoice_number}"
    text = (
        f"Szanowni Państwo,\n\n"
        f"Wystawiliśmy fakturę {invoice_number} na kwotę {gross_amount} {currency}.\n"
        f"Termin płatności: {due_date_str}\n\n"
        "W razie pytań prosimy o kontakt.\n\n"
        "Pozdrawiamy,\nNexflow"
    )
    html = (
        f"<p>Szanowni Państwo,</p>"
        f"<p>Wystawiliśmy fakturę <strong>{invoice_number}</strong> "
        f"na kwotę <strong>{gross_amount} {currency}</strong>.</p>"
        f"<p>Termin płatności: <strong>{due_date_str}</strong></p>"
        "<p>W razie pytań prosimy o kontakt.</p>"
        "<p>Pozdrawiamy,<br>Nexflow</p>"
    )
    return EmailMessage(to="", subject=subject, html=html, text=text)


def _render_invoice_overdue(
    client_name: str,
    invoice_number: str,
    gross_amount: str,
    currency: str,
    due_date_str: str,
) -> EmailMessage:
    subject = f"Nexflow: Faktura {invoice_number} — płatność przeterminowana"
    text = (
        f"Szanowni Państwo,\n\n"
        f"Przypominamy, że faktura {invoice_number} na kwotę {gross_amount} {currency} "
        f"jest przeterminowana (termin: {due_date_str}).\n\n"
        "Prosimy o niezwłoczne uregulowanie należności.\n\n"
        "Pozdrawiamy,\nNexflow"
    )
    html = (
        f"<p>Szanowni Państwo,</p>"
        f"<p>Przypominamy, że faktura <strong>{invoice_number}</strong> "
        f"na kwotę <strong>{gross_amount} {currency}</strong> "
        f"jest <strong>przeterminowana</strong> (termin: {due_date_str}).</p>"
        "<p>Prosimy o niezwłoczne uregulowanie należności.</p>"
        "<p>Pozdrawiamy,<br>Nexflow</p>"
    )
    return EmailMessage(to="", subject=subject, html=html, text=text)


# ---------------------------------------------------------------------------
# Dispatch helpers
# ---------------------------------------------------------------------------


def send_email(to: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send a transactional email via SendGrid. Returns True on success."""
    if not settings.sendgrid_api_key:
        logger.warning("[notifications] SendGrid not configured — skipping email to %s", to)
        return False

    try:
        import sendgrid  # type: ignore[import-untyped]
        from sendgrid.helpers.mail import Mail  # type: ignore[import-untyped]

        sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        message = Mail(
            from_email=settings.sendgrid_from_email,
            to_emails=to,
            subject=subject,
            html_content=html_body,
            plain_text_content=text_body,
        )
        response = sg.send(message)
        if response.status_code >= 400:
            logger.error(
                "[notifications] SendGrid rejected email to %s: HTTP %s",
                to,
                response.status_code,
            )
            return False
        logger.info("[notifications] Email sent to %s (subject: %s)", to, subject)
        return True
    except Exception as exc:
        logger.error("[notifications] Email dispatch failed for %s: %s", to, exc)
        return False


def send_sms(to: str, body: str) -> bool:
    """Send an SMS via Twilio. Returns True on success."""
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("[notifications] Twilio not configured — skipping SMS to %s", to)
        return False

    try:
        from twilio.rest import Client as TwilioClient  # type: ignore[import-untyped]

        client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=body,
            from_=settings.twilio_from_number,
            to=to,
        )
        logger.info("[notifications] SMS sent to %s", to)
        return True
    except Exception as exc:
        logger.error("[notifications] SMS dispatch failed for %s: %s", to, exc)
        return False


# ---------------------------------------------------------------------------
# High-level notification functions (called by Celery tasks)
# ---------------------------------------------------------------------------


def notify_candidate_welcome_email(to_email: str, first_name: str) -> bool:
    msg = _render_welcome_candidate(first_name)
    return send_email(to_email, msg.subject, msg.html, msg.text)


def notify_candidate_welcome_sms(to_phone: str, first_name: str) -> bool:
    body = (
        f"Cześć {first_name}! Twoja rejestracja w Nexflow została przyjęta. "
        "Rekruter skontaktuje się wkrótce."
    )
    return send_sms(to_phone, body)


def notify_compliance_expiry_email(
    to_email: str,
    first_name: str,
    last_name: str,
    alert_type: str,
    due_date_str: str,
    days_remaining: int,
) -> bool:
    msg = _render_compliance_expiry(
        first_name, last_name, alert_type, due_date_str, days_remaining
    )
    return send_email(to_email, msg.subject, msg.html, msg.text)


def notify_invoice_sent_email(
    to_email: str,
    client_name: str,
    invoice_number: str,
    gross_amount: str,
    currency: str,
    due_date_str: str,
) -> bool:
    msg = _render_invoice_sent(client_name, invoice_number, gross_amount, currency, due_date_str)
    return send_email(to_email, msg.subject, msg.html, msg.text)


def notify_invoice_overdue_email(
    to_email: str,
    client_name: str,
    invoice_number: str,
    gross_amount: str,
    currency: str,
    due_date_str: str,
) -> bool:
    msg = _render_invoice_overdue(
        client_name, invoice_number, gross_amount, currency, due_date_str
    )
    return send_email(to_email, msg.subject, msg.html, msg.text)
