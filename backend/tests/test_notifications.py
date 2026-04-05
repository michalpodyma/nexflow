"""
Tests for the notification service and Celery tasks.

Uses mocking throughout — no real external provider calls, no DB required.
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.services.notifications import (
    notify_candidate_welcome_email,
    notify_candidate_welcome_sms,
    notify_compliance_expiry_email,
    notify_invoice_overdue_email,
    notify_invoice_sent_email,
    send_email,
    send_sms,
    _render_welcome_candidate,
    _render_compliance_expiry,
    _render_invoice_sent,
    _render_invoice_overdue,
)


# ---------------------------------------------------------------------------
# Template rendering
# ---------------------------------------------------------------------------


def test_render_welcome_candidate_contains_name() -> None:
    msg = _render_welcome_candidate("Anna")
    assert "Anna" in msg.text
    assert "Anna" in msg.html
    assert "Nexflow" in msg.subject


def test_render_compliance_expiry_known_type() -> None:
    msg = _render_compliance_expiry("Jan", "Nowak", "health_cert_expiry", "2026-05-01", 14)
    assert "Jan Nowak" in msg.text
    assert "14" in msg.text
    assert "badanie lekarskie" in msg.text


def test_render_compliance_expiry_unknown_type_falls_back() -> None:
    msg = _render_compliance_expiry("Jan", "Nowak", "some_unknown_type", "2026-05-01", 7)
    assert "some_unknown_type" in msg.text


def test_render_invoice_sent_contains_fields() -> None:
    msg = _render_invoice_sent("ACME GmbH", "FV/2026/001", "12300.00", "PLN", "2026-05-31")
    assert "FV/2026/001" in msg.text
    assert "12300.00" in msg.text
    assert "PLN" in msg.text
    assert "2026-05-31" in msg.text


def test_render_invoice_overdue_subject_indicates_overdue() -> None:
    msg = _render_invoice_overdue("ACME GmbH", "FV/2026/001", "12300.00", "EUR", "2026-04-01")
    assert "przeterminowana" in msg.subject.lower() or "przeterminowana" in msg.text


# ---------------------------------------------------------------------------
# send_email — provider not configured
# ---------------------------------------------------------------------------


def test_send_email_skips_when_no_api_key() -> None:
    with patch("app.services.notifications.settings") as mock_settings:
        mock_settings.sendgrid_api_key = ""
        result = send_email("a@b.com", "Subj", "<p>hi</p>", "hi")
    assert result is False


def test_send_sms_skips_when_no_credentials() -> None:
    with patch("app.services.notifications.settings") as mock_settings:
        mock_settings.twilio_account_sid = ""
        mock_settings.twilio_auth_token = ""
        result = send_sms("+48123456789", "Hello")
    assert result is False


# ---------------------------------------------------------------------------
# send_email — SendGrid happy path
# ---------------------------------------------------------------------------


def test_send_email_returns_true_on_accepted() -> None:
    mock_response = MagicMock()
    mock_response.status_code = 202

    mock_sg_instance = MagicMock()
    mock_sg_instance.send.return_value = mock_response

    mock_sg_class = MagicMock(return_value=mock_sg_instance)
    mock_mail_class = MagicMock()

    with (
        patch("app.services.notifications.settings") as mock_settings,
        patch.dict(
            "sys.modules",
            {
                "sendgrid": MagicMock(SendGridAPIClient=mock_sg_class),
                "sendgrid.helpers.mail": MagicMock(Mail=mock_mail_class),
            },
        ),
    ):
        mock_settings.sendgrid_api_key = "SG.fake"
        mock_settings.sendgrid_from_email = "noreply@nexflow.work"
        result = send_email("test@example.com", "Subject", "<p>hi</p>", "hi")

    assert result is True


def test_send_email_returns_false_on_provider_error() -> None:
    mock_response = MagicMock()
    mock_response.status_code = 400

    mock_sg_instance = MagicMock()
    mock_sg_instance.send.return_value = mock_response

    mock_sg_class = MagicMock(return_value=mock_sg_instance)
    mock_mail_class = MagicMock()

    with (
        patch("app.services.notifications.settings") as mock_settings,
        patch.dict(
            "sys.modules",
            {
                "sendgrid": MagicMock(SendGridAPIClient=mock_sg_class),
                "sendgrid.helpers.mail": MagicMock(Mail=mock_mail_class),
            },
        ),
    ):
        mock_settings.sendgrid_api_key = "SG.fake"
        mock_settings.sendgrid_from_email = "noreply@nexflow.work"
        result = send_email("test@example.com", "Subject", "<p>hi</p>", "hi")

    assert result is False


# ---------------------------------------------------------------------------
# send_sms — Twilio happy path
# ---------------------------------------------------------------------------


def test_send_sms_returns_true_on_success() -> None:
    mock_client_instance = MagicMock()
    mock_client_class = MagicMock(return_value=mock_client_instance)

    with (
        patch("app.services.notifications.settings") as mock_settings,
        patch.dict(
            "sys.modules",
            {
                "twilio": MagicMock(),
                "twilio.rest": MagicMock(Client=mock_client_class),
            },
        ),
    ):
        mock_settings.twilio_account_sid = "ACfake"
        mock_settings.twilio_auth_token = "token"
        mock_settings.twilio_from_number = "+12345678901"
        result = send_sms("+48123456789", "Hello")

    assert result is True


def test_send_sms_returns_false_on_exception() -> None:
    def _raise(*args, **kwargs):  # type: ignore[no-untyped-def]
        raise RuntimeError("Twilio down")

    mock_client_instance = MagicMock()
    mock_client_instance.messages.create.side_effect = _raise
    mock_client_class = MagicMock(return_value=mock_client_instance)

    with (
        patch("app.services.notifications.settings") as mock_settings,
        patch.dict(
            "sys.modules",
            {
                "twilio": MagicMock(),
                "twilio.rest": MagicMock(Client=mock_client_class),
            },
        ),
    ):
        mock_settings.twilio_account_sid = "ACfake"
        mock_settings.twilio_auth_token = "token"
        mock_settings.twilio_from_number = "+12345678901"
        result = send_sms("+48123456789", "Hello")

    assert result is False


# ---------------------------------------------------------------------------
# High-level notification helpers delegate to send_email / send_sms
# ---------------------------------------------------------------------------


def test_notify_candidate_welcome_email_calls_send_email() -> None:
    with patch("app.services.notifications.send_email", return_value=True) as mock_send:
        result = notify_candidate_welcome_email("a@b.com", "Karol")
    assert result is True
    mock_send.assert_called_once()
    call_kwargs = mock_send.call_args
    assert call_kwargs[0][0] == "a@b.com"


def test_notify_candidate_welcome_sms_calls_send_sms() -> None:
    with patch("app.services.notifications.send_sms", return_value=True) as mock_send:
        result = notify_candidate_welcome_sms("+48123456789", "Karol")
    assert result is True
    mock_send.assert_called_once()


def test_notify_compliance_expiry_email_calls_send_email() -> None:
    with patch("app.services.notifications.send_email", return_value=True) as mock_send:
        result = notify_compliance_expiry_email(
            "worker@example.com", "Jan", "Kowalski", "health_cert_expiry", "2026-05-01", 7
        )
    assert result is True
    mock_send.assert_called_once()


def test_notify_invoice_sent_email_calls_send_email() -> None:
    with patch("app.services.notifications.send_email", return_value=True) as mock_send:
        result = notify_invoice_sent_email(
            "client@example.com", "ACME", "FV/2026/001", "12300.00", "PLN", "2026-05-31"
        )
    assert result is True
    mock_send.assert_called_once()


def test_notify_invoice_overdue_email_calls_send_email() -> None:
    with patch("app.services.notifications.send_email", return_value=True) as mock_send:
        result = notify_invoice_overdue_email(
            "client@example.com", "ACME", "FV/2026/001", "12300.00", "PLN", "2026-04-01"
        )
    assert result is True
    mock_send.assert_called_once()
