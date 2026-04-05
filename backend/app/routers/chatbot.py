"""
Chatbot management endpoints.

POST /api/v1/chatbot/initiate
    Trigger WhatsApp screening session(s) for one or more candidates.
    Used for bulk/manual outreach by recruiters — "send the bot to these candidates".

    Requires auth (recruiter dashboard).

    Request body:
        {
          "candidate_ids": ["uuid1", "uuid2", ...]
        }

    Response:
        {
          "initiated": ["uuid1", ...],   # sessions created and opening message sent
          "skipped":   ["uuid2", ...],   # already screened / no phone / in progress
          "errors":    ["uuid3", ...]    # unexpected failures
        }
"""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.candidates import Candidate
from app.models.enums import ChatbotChannel
from app.services.chatbot_fsm import initiate_session

router = APIRouter(prefix="/api/v1/chatbot", tags=["chatbot"])

logger = logging.getLogger(__name__)


class InitiateRequest(BaseModel):
    candidate_ids: list[UUID]


class InitiateResponse(BaseModel):
    initiated: list[str]
    skipped: list[str]
    errors: list[str]


@router.post("/initiate", response_model=InitiateResponse)
async def initiate_chatbot_sessions(
    body: InitiateRequest,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InitiateResponse:
    """
    Trigger WhatsApp screening sessions for a list of candidates.

    Candidates that are already past the 'new' status or have no phone number
    are silently skipped and reported in the 'skipped' list.
    """
    if not body.candidate_ids:
        raise HTTPException(status_code=422, detail="candidate_ids must not be empty")

    result = await db.execute(
        select(Candidate).where(Candidate.id.in_(body.candidate_ids))
    )
    candidates = list(result.scalars().all())

    found_ids = {c.id for c in candidates}
    missing = [str(cid) for cid in body.candidate_ids if cid not in found_ids]

    initiated: list[str] = []
    skipped: list[str] = list(missing)
    errors: list[str] = []

    for candidate in candidates:
        try:
            session = await initiate_session(
                candidate, db, channel=ChatbotChannel.whatsapp
            )
            if session is not None:
                initiated.append(str(candidate.id))
                logger.info(
                    "[chatbot] Initiated session %s for candidate %s",
                    session.id,
                    candidate.id,
                )
            else:
                skipped.append(str(candidate.id))
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "[chatbot] Failed to initiate session for candidate %s: %s",
                candidate.id,
                exc,
            )
            errors.append(str(candidate.id))

    return InitiateResponse(initiated=initiated, skipped=skipped, errors=errors)
