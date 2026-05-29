"""
SQLAlchemy 2.x async models for the Nexflow platform.

Import order matters — tables referenced by FKs must be registered with Base.metadata
before the tables that reference them. SQLAlchemy resolves this at DDL emit time, but
explicit ordering avoids confusion.

All models share Base from .base; import Base here when you need Base.metadata for
Alembic autogenerate (see db/migrations/env.py).
"""

from .accommodations import Accommodation, AccommodationAssignment
from .assignments import Assignment, AssignmentRate
from .audit import AuditLog
from .base import Base
from .candidate_job_orders import CandidateJobOrder
from .candidate_reminders import CandidateReminder
from .candidates import Candidate
from .chatbot import ChatbotSession
from .client_activities import ActivityType, ClientActivity
from .client_contacts import ClientContact
from .clients import Client
from .compliance import ComplianceAlert
from .documents import DocumentTemplate, GeneratedDocument
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
from .gdpr import GdprConsent
from .hours_import import ClientColumnMapping, HoursImportBatch, WorkerHours
from .invoices import Invoice
from .job_orders import JobOrder
from .notifications import NotificationLog
from .positions import Position
from .prospects import Prospect
from .shifts import ShiftEntry, ShiftTemplate
from .transport import TransportAssignment, TransportRoute, Vehicle
from .whatsapp_inbox import WhatsAppInboxEvent
from .worker_files import WorkerFile
from .worker_otp import WorkerOTP
from .workers import Worker

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
    "DocumentTemplate",
    "GeneratedDocument",
    "ClientActivity",
    "ActivityType",
    "ClientContact",
    "Prospect",
    "WorkerFile",
    "HoursImportBatch",
    "ClientColumnMapping",
    "WorkerHours",
    "NotificationLog",
    "ShiftTemplate",
    "ShiftEntry",
    "WorkerOTP",
    "WhatsAppInboxEvent",
]
