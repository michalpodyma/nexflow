from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.auth.agent_middleware import RequireAgentKey
from app.database import get_db
from app.models.facebook import FacebookPostQueue

router = APIRouter(prefix="/api/agent/facebook", tags=["facebook-agent"])


class QueuePostRequest(BaseModel):
    message: str
    image_url: str | None = None
    scheduled_at: datetime  # ISO 8601 with timezone

    @field_validator("scheduled_at")
    @classmethod
    def must_be_timezone_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            raise ValueError("scheduled_at must include timezone information")
        return v


class QueuePostResponse(BaseModel):
    id: str
    scheduled_at: datetime

    model_config = {"from_attributes": True}


@router.post(
    "/queue",
    response_model=QueuePostResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Queue a Facebook post for scheduled publishing",
    description="Agent-accessible endpoint. Requires Bearer token with type=agent_run claim or AGENT_API_KEY.",
)
async def queue_facebook_post(
    body: QueuePostRequest,
    _: Annotated[None, Depends(RequireAgentKey)],
    db: Session = Depends(get_db),
) -> QueuePostResponse:
    post = FacebookPostQueue(
        message=body.message,
        image_url=body.image_url,
        scheduled_at=body.scheduled_at,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return QueuePostResponse(id=str(post.id), scheduled_at=post.scheduled_at)
