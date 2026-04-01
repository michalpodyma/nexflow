"""
SQLAlchemy 2.x async models for the Nexflow platform.

Import order matters — tables referenced by FKs must be registered with Base.metadata
before the tables that reference them. SQLAlchemy resolves this at DDL emit time, but
explicit ordering avoids confusion.

All models share Base from .base; import Base here when you need Base.metadata for
Alembic autogenerate (see db/migrations/env.py).
"""

from .base import Base
from .enums import (
    AlertType,
    AuditAction,
    ChatbotChannel,
    Currency,
    GdprSubjectType,
    PaymentStatus,
    PreferredPosition,
    ScreeningStatus,
    WorkPermitType,
)
from .clients import Client
from .workers import Worker
from .candidates import Candidate
from .candidate_reminders import CandidateReminder
from .assignments import Assignment, AssignmentRate
from .invoices import Invoice
from .positions import Position
from .gdpr import GdprConsent
from .chatbot import ChatbotSession
from .compliance import ComplianceAlert
from .audit import AuditLog

__all__ = [
    "Base",
    # Enums
    "AlertType",
    "AuditAction",
    "ChatbotChannel",
    "Currency",
    "GdprSubjectType",
    "PaymentStatus",
    "PreferredPosition",
    "ScreeningStatus",
    "WorkPermitType",
    # Models
    "Client",
    "Worker",
    "Candidate",
    "CandidateReminder",
    "Assignment",
    "AssignmentRate",
    "Invoice",
    "Position",
    "GdprConsent",
    "ChatbotSession",
    "ComplianceAlert",
    "AuditLog",
]
