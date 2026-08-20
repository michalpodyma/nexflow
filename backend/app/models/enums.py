"""
Python Enum classes for all domain enumerations.

Each enum here has a corresponding PostgreSQL native enum type created in the
initial schema migration (0001_initial_schema.py). The naming convention is:
    Python class name  →  PostgreSQL type name
    WorkPermitType     →  work_permit_type
    PreferredPosition  →  preferred_position
    ScreeningStatus    →  screening_status
    PaymentStatus      →  payment_status
    Currency           →  currency_enum
    ChatbotChannel     →  chatbot_channel
    AlertType          →  alert_type
    AuditAction        →  audit_action
    GdprSubjectType    →  gdpr_subject_type
"""

import enum


class WorkPermitType(str, enum.Enum):
    """Work permit classification for non-EU workers."""
    UE = "UE"
    non_UE_permit = "non_UE_permit"
    none = "none"


class PreferredPosition(str, enum.Enum):
    """Job positions the platform supports for candidate matching."""
    warehouse_picker = "warehouse_picker"
    forklift_operator = "forklift_operator"
    logistics_driver = "logistics_driver"
    other = "other"


class ScreeningStatus(str, enum.Enum):
    """Candidate pipeline stage in the recruitment funnel."""
    new = "new"
    chatbot_in_progress = "chatbot_in_progress"
    screened_pass = "screened_pass"
    screened_fail = "screened_fail"
    offered = "offered"
    hired = "hired"
    rejected = "rejected"


class PaymentStatus(str, enum.Enum):
    """Invoice payment state."""
    pending = "pending"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"


class Currency(str, enum.Enum):
    """
    Billing currency.
    PLN — Polish clients (23% VAT).
    EUR — DE/EU clients (0% VAT reverse charge).
    """
    PLN = "PLN"
    EUR = "EUR"


class ChatbotChannel(str, enum.Enum):
    """Channel through which a chatbot screening session was initiated."""
    whatsapp = "whatsapp"
    web = "web"


class AlertType(str, enum.Enum):
    """Type of compliance alert raised for a worker."""
    contract_expiry = "contract_expiry"
    health_cert_expiry = "health_cert_expiry"
    bhp_cert_expiry = "bhp_cert_expiry"
    a1_cert_expiry = "a1_cert_expiry"
    deployment_limit_warning = "deployment_limit_warning"


class AuditAction(str, enum.Enum):
    """DML operation recorded in the audit_log."""
    insert = "insert"
    update = "update"
    delete = "delete"


class GdprSubjectType(str, enum.Enum):
    """Entity type that a GDPR consent record refers to."""
    worker = "worker"
    candidate = "candidate"


class LanguageCode(str, enum.Enum):
    """ISO 639-1 language codes supported by the candidate intake form."""
    pl = "pl"
    de = "de"
    en = "en"
    uk = "uk"
    ru = "ru"


class JobPostingPlatform(str, enum.Enum):
    """External job board platform."""
    olx = "olx"
    pracuj = "pracuj"


class JobPostingStatus(str, enum.Enum):
    """Lifecycle status of a job posting on an external board."""
    active = "active"
    expired = "expired"
    removed = "removed"


class AttendanceStatus(str, enum.Enum):
    """Worker presence/employment status for performance tracking."""
    active = "active"
    off = "off"
    terminated = "terminated"


class JobOrderUrgency(str, enum.Enum):
    """Urgency level for a client job order."""
    normal = "normal"
    urgent = "urgent"
    critical = "critical"


class JobOrderStatus(str, enum.Enum):
    """Lifecycle status of a client job order."""
    open = "open"
    sourcing = "sourcing"
    submitted = "submitted"
    interview = "interview"
    filled = "filled"
    on_hold = "on_hold"
    cancelled = "cancelled"


class CandidateJobOrderStatus(str, enum.Enum):
    """Submission status of a candidate linked to a job order."""
    submitted = "submitted"
    interviewing = "interviewing"
    offered = "offered"
    placed = "placed"
    rejected = "rejected"


class TemplateType(str, enum.Enum):
    """Type of document template used for contract generation."""
    employment_contract = "employment_contract"
    mandate_contract = "mandate_contract"
    annex = "annex"
    other = "other"
    # Legalization document types (praca.gov)
    oswiadczenie = "oswiadczenie"
    permit_a = "permit_a"
    permit_b = "permit_b"
    permit_seasonal = "permit_seasonal"
    residence_prep = "residence_prep"


class DocumentStatus(str, enum.Enum):
    """Lifecycle status of a generated document."""
    draft = "draft"
    final = "final"
    signed = "signed"


class ConversationIntent(str, enum.Enum):
    """Intent classified by ElevenLabs post-call webhook (EUR-1575)."""
    candidate_application = "candidate_application"
    client_inquiry = "client_inquiry"
    other = "other"


class HRappkaSyncStatus(str, enum.Enum):
    """HRappka sync state for an ElevenLabs conversation record (EUR-1575)."""
    pending = "pending"
    synced = "synced"
    failed = "failed"
    skipped = "skipped"
