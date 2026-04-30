import uuid

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class FacebookPostQueue(Base):
    __tablename__ = "facebook_post_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default="now()")
    posted_at = Column(DateTime(timezone=True), nullable=True)
    post_id = Column(String, nullable=True)
    post_url = Column(String, nullable=True)
