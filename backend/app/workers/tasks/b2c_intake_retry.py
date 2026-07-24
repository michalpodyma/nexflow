"""
Celery beat task: retry Paperclip issue creation for acked B2C intake events.

Sweeps whatsapp_inbox_events rows where:
  - acknowledged_at IS NOT NULL  (candidate was acked — event ownership confirmed)
  - paperclip_issue_id IS NULL   (issue creation failed, e.g. SSH tunnel was down)
  - received_at >= NOW() - RETRY_WINDOW_DAYS  (ignore stale events)

Dedupe is handled inside create_intake_paperclip_issue (open-issue phone search),
so this sweep is idempotent — safe to re-run even if a prior attempt half-succeeded.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta

import sqlalchemy as sa

from app.database import AsyncSessionLocal
from app.models.candidates import Candidate
from app.models.whatsapp_inbox import WhatsAppInboxEvent
from app.services.b2c_intake import (
    create_intake_paperclip_issue,
    detect_language,
    detect_pii,
)
from app.services.whatsapp import normalize_phone
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

RETRY_WINDOW_DAYS = 7
SWEEP_BATCH_LIMIT = 50


@celery_app.task(name="workers.tasks.b2c_intake_retry.sweep_pending_paperclip_issues")
def sweep_pending_paperclip_issues() -> None:
    asyncio.run(_sweep())


async def _sweep() -> None:
    async with AsyncSessionLocal() as db:
        cutoff = datetime.now(tz=UTC) - timedelta(days=RETRY_WINDOW_DAYS)
        result = await db.execute(
            sa.select(WhatsAppInboxEvent)
            .where(
                WhatsAppInboxEvent.acknowledged_at.isnot(None),
                WhatsAppInboxEvent.paperclip_issue_id.is_(None),
                WhatsAppInboxEvent.received_at >= cutoff,
                WhatsAppInboxEvent.candidate_id.isnot(None),
            )
            .order_by(WhatsAppInboxEvent.received_at)
            .limit(SWEEP_BATCH_LIMIT)
        )
        events = result.scalars().all()

        if not events:
            logger.debug("[b2c_intake_retry] No pending events to retry")
            return

        logger.info(
            "[b2c_intake_retry] Retrying Paperclip issue creation for %d event(s)", len(events)
        )

        for event in events:
            try:
                cand_result = await db.execute(
                    sa.select(Candidate).where(Candidate.id == event.candidate_id)
                )
                candidate = cand_result.scalar_one_or_none()
                if candidate is None or not candidate.phone:
                    logger.warning(
                        "[b2c_intake_retry] Event %s has no resolvable candidate phone — skipping",
                        event.id,
                    )
                    continue

                phone = "+" + normalize_phone(candidate.phone)
                lang = detect_language(event.message_text)
                has_pii, pii_types = detect_pii(event.message_text)

                issue_id = await create_intake_paperclip_issue(
                    phone=phone,
                    candidate_id=str(event.candidate_id),
                    message_text=event.message_text,
                    wamid="",
                    language=lang,
                    has_pii=has_pii,
                    pii_types=pii_types,
                )
                if issue_id:
                    event.paperclip_issue_id = issue_id
                    logger.info(
                        "[b2c_intake_retry] Linked event %s to Paperclip issue %s",
                        event.id,
                        issue_id,
                    )
            except Exception as exc:  # noqa: BLE001
                logger.exception(
                    "[b2c_intake_retry] Unexpected error retrying event %s: %s", event.id, exc
                )

        await db.commit()
