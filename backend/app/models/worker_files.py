from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class WorkerFile(Base):
    """
    A file uploaded and attached to a worker record.

    Files are stored in Backblaze B2 (S3-compatible). Only the object key and
    metadata are persisted here; the actual bytes live in B2.

    GDPR: files are deleted when the worker record is erased via the
    right-to-erasure workflow (the application must call the B2 delete API
    in addition to deleting this row).
    """

    __tablename__ = "worker_files"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    worker_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("workers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Human-readable original file name (e.g. "passport_jan_kowalski.pdf")
    file_name: Mapped[str] = mapped_column(sa.String(500), nullable=False)
    # MIME type captured at upload time
    content_type: Mapped[str] = mapped_column(sa.String(200), nullable=False, server_default="application/octet-stream")
    # Size in bytes
    file_size: Mapped[int] = mapped_column(sa.BigInteger, nullable=False, server_default="0")
    # B2 object key — used to build download / delete URLs at runtime
    storage_key: Mapped[str] = mapped_column(sa.String(1000), nullable=False)
    # Optional label to categorise the document
    # e.g. "work_permit", "passport", "medical_exam", "bhp_cert", "other"
    document_type: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)

    uploaded_by_user: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
