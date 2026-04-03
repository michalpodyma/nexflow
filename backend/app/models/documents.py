"""
Document template and generated document models.

DocumentTemplate — reusable HTML templates with placeholder tokens for
contract generation (e.g. Umowa o pracę, Umowa zlecenie).

GeneratedDocument — rendered instances of templates filled with real worker
and assignment data, with optional PDF export.

Placeholder token syntax: {{worker.first_name}}, {{client.company_name}}, etc.
"""

from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import DocumentStatus, TemplateType


class DocumentTemplate(Base):
    """
    Reusable HTML contract template with placeholder tokens.

    body_html contains the full HTML document with tokens like:
        {{worker.first_name}}, {{worker.last_name}}, {{worker.pesel}},
        {{worker.address}}, {{worker.nationality}},
        {{client.company_name}}, {{client.nip}}, {{client.address}},
        {{assignment.start_date}}, {{assignment.end_date}},
        {{assignment.hourly_rate}}, {{assignment.position}},
        {{generated_date}}, {{generated_by}}
    """

    __tablename__ = "document_templates"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    template_type: Mapped[TemplateType] = mapped_column(
        sa.Enum(TemplateType, name="template_type_enum", create_type=False),
        nullable=False,
    )
    body_html: Mapped[str] = mapped_column(sa.Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.true()
    )
    version: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, server_default=sa.text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )


class GeneratedDocument(Base):
    """
    A rendered document instance produced from a DocumentTemplate.

    rendered_html contains the final HTML with all placeholder tokens
    replaced with real worker/assignment data.

    pdf_data stores the binary PDF content after finalization (WeasyPrint).
    The document transitions: draft → final (PDF generated) → signed.
    """

    __tablename__ = "generated_documents"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    template_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("document_templates.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    worker_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("workers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assignment_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("assignments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    rendered_html: Mapped[str] = mapped_column(sa.Text, nullable=False)
    pdf_data: Mapped[bytes | None] = mapped_column(sa.LargeBinary, nullable=True)
    status: Mapped[DocumentStatus] = mapped_column(
        sa.Enum(DocumentStatus, name="document_status_enum", create_type=False),
        nullable=False,
        server_default="draft",
    )
    generated_by_user: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    template_name_snapshot: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
