from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import CandidateJobOrderStatus


class CandidateJobOrder(Base):
    """
    Junction table linking candidates to job orders (many-to-many).

    Tracks the submission pipeline status for a candidate against a specific
    job order, from initial submission through placed or rejected.
    """

    __tablename__ = "candidate_job_orders"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("uuid_generate_v4()"),
    )
    candidate_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        sa.ForeignKey("job_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[CandidateJobOrderStatus] = mapped_column(
        sa.Enum(CandidateJobOrderStatus, name="candidate_job_order_status", create_type=False),
        nullable=False,
        server_default="submitted",
        index=True,
    )
    submitted_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")
    )

    __table_args__ = (
        sa.UniqueConstraint("candidate_id", "job_order_id", name="uq_candidate_job_order"),
    )
