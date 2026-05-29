"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-02

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # If the DB was already initialised outside Alembic (e.g. via
    # Base.metadata.create_all on a prior Railway deployment), skip all DDL.
    # The alembic_version row will be stamped with 0001 so subsequent
    # migrations (0002, 0003 …) can run normally.
    if inspect(op.get_bind()).has_table("admin_users"):
        return

    # --- Extensions ---
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # --- Enum types ---
    op.execute("""
        CREATE TYPE work_permit_type AS ENUM ('UE', 'non_UE_permit', 'none')
    """)
    op.execute("""
        CREATE TYPE preferred_position AS ENUM (
            'warehouse_picker', 'forklift_operator', 'logistics_driver', 'other'
        )
    """)
    op.execute("""
        CREATE TYPE screening_status AS ENUM (
            'new', 'chatbot_in_progress', 'screened_pass', 'screened_fail',
            'offered', 'hired', 'rejected'
        )
    """)
    op.execute("""
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled')
    """)
    op.execute("""
        CREATE TYPE currency_enum AS ENUM ('PLN', 'EUR')
    """)
    op.execute("""
        CREATE TYPE chatbot_channel AS ENUM ('whatsapp', 'web')
    """)
    op.execute("""
        CREATE TYPE alert_type AS ENUM (
            'contract_expiry', 'health_cert_expiry', 'bhp_cert_expiry',
            'a1_cert_expiry', 'deployment_limit_warning'
        )
    """)
    op.execute("""
        CREATE TYPE audit_action AS ENUM ('insert', 'update', 'delete')
    """)
    op.execute("""
        CREATE TYPE gdpr_subject_type AS ENUM ('worker', 'candidate')
    """)
    op.execute("""
        CREATE TYPE attendance_status_enum AS ENUM ('active', 'off', 'terminated')
    """)
    op.execute("""
        CREATE TYPE job_posting_platform AS ENUM ('olx', 'pracuj')
    """)
    op.execute("""
        CREATE TYPE job_posting_status AS ENUM ('active', 'expired', 'removed')
    """)

    # --- admin_users ---
    op.create_table(
        "admin_users",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("hashed_password", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- workers ---
    op.create_table(
        "workers",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("date_of_birth", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("nationality", sa.String(2), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("pesel", sa.Text, nullable=True),
        sa.Column("passport_number", sa.Text, nullable=True),
        sa.Column("work_permit_type", sa.Enum(name="work_permit_type", create_type=False),
                  nullable=True),
        sa.Column("work_permit_expiry", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("health_cert_expiry", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("a1_cert_status", sa.String(50), nullable=True),
        sa.Column("a1_cert_expiry", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("zus_status", sa.String(50), nullable=True),
        sa.Column("attendance_status",
                  sa.Enum(name="attendance_status_enum", create_type=False),
                  nullable=False, server_default="active"),
        sa.Column("gdpr_consent", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("gdpr_consent_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("gdpr_delete_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- candidates ---
    op.create_table(
        "candidates",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("nationality", sa.String(2), nullable=True),
        sa.Column("availability_from", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("preferred_position",
                  sa.Enum(name="preferred_position", create_type=False), nullable=True),
        sa.Column("languages", JSONB, nullable=True),
        sa.Column("location_preference", sa.String(255), nullable=True),
        sa.Column("screening_status",
                  sa.Enum(name="screening_status", create_type=False),
                  nullable=False, server_default="new"),
        sa.Column("screening_score", sa.Integer, nullable=True),
        sa.Column("chatbot_session_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("id_doc_url", sa.Text, nullable=True),
        sa.Column("health_cert_url", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("contacted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("job_posting_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("gdpr_consent", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("gdpr_consent_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("gdpr_delete_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- clients ---
    op.create_table(
        "clients",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("nip", sa.String(20), unique=True, nullable=True),
        sa.Column("vat_eu", sa.String(30), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("postal_code", sa.String(20), nullable=True),
        sa.Column("country", sa.String(2), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("account_manager_name", sa.String(255), nullable=True),
        sa.Column("payment_terms_days", sa.Integer, nullable=False, server_default="30"),
        sa.Column("currency", sa.Enum(name="currency_enum", create_type=False),
                  nullable=False, server_default="PLN"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- chatbot_sessions (depends on candidates) ---
    op.create_table(
        "chatbot_sessions",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("candidate_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.Enum(name="chatbot_channel", create_type=False),
                  nullable=False),
        sa.Column("session_state", JSONB, nullable=True),
        sa.Column("messages", JSONB, nullable=True),
        sa.Column("started_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("score", sa.Integer, nullable=True),
    )

    # --- positions (depends on clients) ---
    op.create_table(
        "positions",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("client_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("headcount_needed", sa.Integer, nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- assignments (depends on workers, clients) ---
    op.create_table(
        "assignments",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("worker_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("workers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("client_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("position", sa.String(255), nullable=False),
        sa.Column("employer_rate", sa.Numeric(12, 2), nullable=False),
        sa.Column("worker_rate", sa.Numeric(12, 2), nullable=False),
        sa.Column("bhp_cost", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("accommodation_cost", sa.Numeric(12, 2), nullable=False,
                  server_default="0.00"),
        sa.Column("transport_cost", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("start_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("end_date", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- assignment_rates (depends on assignments) ---
    op.create_table(
        "assignment_rates",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("assignment_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("effective_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("employer_rate", sa.Numeric(12, 2), nullable=False),
        sa.Column("worker_rate", sa.Numeric(12, 2), nullable=False),
        sa.Column("bhp_cost", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("accommodation_cost", sa.Numeric(12, 2), nullable=False,
                  server_default="0.00"),
        sa.Column("transport_cost", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- invoices (depends on clients) ---
    op.create_table(
        "invoices",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("client_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("invoice_number", sa.String(50), unique=True, nullable=False),
        sa.Column("sale_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("due_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("vat_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("vat_rate", sa.Numeric(5, 2), nullable=False, server_default="0.00"),
        sa.Column("currency", sa.Enum(name="currency_enum", create_type=False),
                  nullable=False, server_default="PLN"),
        sa.Column("payment_status", sa.Enum(name="payment_status", create_type=False),
                  nullable=False, server_default="pending"),
        sa.Column("period_start", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("period_end", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- compliance_alerts (depends on workers) ---
    op.create_table(
        "compliance_alerts",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("worker_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("workers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alert_type", sa.Enum(name="alert_type", create_type=False),
                  nullable=False),
        sa.Column("due_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("acknowledged", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- audit_log (no FK deps) ---
    op.create_table(
        "audit_log",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", PGUUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.Enum(name="audit_action", create_type=False), nullable=False),
        sa.Column("changed_by", sa.String(255), nullable=True),
        sa.Column("changed_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("payload", JSONB, nullable=True),
    )

    # --- gdpr_consents (no FK deps — abstract subject_id) ---
    op.create_table(
        "gdpr_consents",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("subject_type", sa.Enum(name="gdpr_subject_type", create_type=False),
                  nullable=False),
        sa.Column("subject_id", PGUUID(as_uuid=True), nullable=False),
        sa.Column("consent_type", sa.String(100), nullable=False),
        sa.Column("granted", sa.Boolean, nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- job_postings (no FK deps) ---
    op.create_table(
        "job_postings",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("platform", sa.Enum(name="job_posting_platform", create_type=False),
                  nullable=False),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("listing_url", sa.Text, nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("salary_min", sa.Integer, nullable=True),
        sa.Column("salary_max", sa.Integer, nullable=True),
        sa.Column("currency", sa.Enum(name="currency_enum", create_type=False), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("apply_url", sa.Text, nullable=False,
                  server_default="https://nexflow.work/oferty"),
        sa.Column("posted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("status", sa.Enum(name="job_posting_status", create_type=False),
                  nullable=False, server_default="active"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- candidate_reminders (depends on candidates) ---
    op.create_table(
        "candidate_reminders",
        sa.Column("id", PGUUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("candidate_id", PGUUID(as_uuid=True),
                  sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("reminder_date", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("reminder_text", sa.Text, nullable=False),
        sa.Column("dismissed", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # --- GDPR trigger: auto-set gdpr_delete_at = created_at + 12 months ---
    op.execute("""
        CREATE OR REPLACE FUNCTION set_gdpr_delete_at()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.gdpr_delete_at IS NULL THEN
                NEW.gdpr_delete_at := NEW.created_at + INTERVAL '12 months';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER candidates_gdpr_delete_at_trigger
        BEFORE INSERT ON candidates
        FOR EACH ROW EXECUTE FUNCTION set_gdpr_delete_at();
    """)
    op.execute("""
        CREATE TRIGGER workers_gdpr_delete_at_trigger
        BEFORE INSERT ON workers
        FOR EACH ROW EXECUTE FUNCTION set_gdpr_delete_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS workers_gdpr_delete_at_trigger ON workers")
    op.execute("DROP TRIGGER IF EXISTS candidates_gdpr_delete_at_trigger ON candidates")
    op.execute("DROP FUNCTION IF EXISTS set_gdpr_delete_at()")

    op.drop_table("candidate_reminders")
    op.drop_table("job_postings")
    op.drop_table("gdpr_consents")
    op.drop_table("audit_log")
    op.drop_table("compliance_alerts")
    op.drop_table("invoices")
    op.drop_table("assignment_rates")
    op.drop_table("assignments")
    op.drop_table("positions")
    op.drop_table("chatbot_sessions")
    op.drop_table("clients")
    op.drop_table("candidates")
    op.drop_table("workers")
    op.drop_table("admin_users")

    op.execute("DROP TYPE IF EXISTS job_posting_status")
    op.execute("DROP TYPE IF EXISTS job_posting_platform")
    op.execute("DROP TYPE IF EXISTS attendance_status_enum")
    op.execute("DROP TYPE IF EXISTS gdpr_subject_type")
    op.execute("DROP TYPE IF EXISTS audit_action")
    op.execute("DROP TYPE IF EXISTS alert_type")
    op.execute("DROP TYPE IF EXISTS chatbot_channel")
    op.execute("DROP TYPE IF EXISTS currency_enum")
    op.execute("DROP TYPE IF EXISTS payment_status")
    op.execute("DROP TYPE IF EXISTS screening_status")
    op.execute("DROP TYPE IF EXISTS preferred_position")
    op.execute("DROP TYPE IF EXISTS work_permit_type")
