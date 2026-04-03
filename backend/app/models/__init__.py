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
    CandidateJobOrderStatus,
    ChatbotChannel,
    Currency,
    GdprSubjectType,
    JobOrderStatus,
    JobOrderUrgency,
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
from .job_orders import JobOrder
from .candidate_job_orders import CandidateJobOrder
from .accommodations import Accommodation, AccommodationAssignment
from .transport import TransportAssignment, TransportRoute, Vehicle

__all__ = [
    "Base",
    # Enums
    "AlertType",
    "AuditAction",
    "CandidateJobOrderStatus",
    "ChatbotChannel",
    "Currency",
    "GdprSubjectType",
    "JobOrderStatus",
    "JobOrderUrgency",
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
    "JobOrder",
    "CandidateJobOrder",
    "Accommodation",
    "AccommodationAssignment",
    "Vehicle",
    "TransportRoute",
    "TransportAssignment",
]
