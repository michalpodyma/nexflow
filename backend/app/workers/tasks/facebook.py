"""
Celery task for scheduled Facebook Page posts.

Intended schedule: Mon/Wed/Fri at 17:00 UTC (19:00 CEST).
CMO triggers posts manually via POST /api/admin/facebook/post.
This beat task is a placeholder — it logs a notice when no message is queued.
"""

import asyncio
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="post_scheduled_facebook")
def post_scheduled_facebook(message: str | None = None, image_url: str | None = None) -> None:
    """Post a scheduled update to the Facebook Page.

    When called by Celery beat without arguments, logs a placeholder notice.
    When called manually with a message, delegates to FacebookService.
    """
    if not message:
        logger.info("post_scheduled_facebook: no message queued — skipping.")
        return

    async def _post() -> None:
        from app.services import facebook as fb_service

        if image_url:
            result = await fb_service.post_photo(caption=message, image_url=image_url)
        else:
            result = await fb_service.post_text(message=message)
        logger.info("Scheduled Facebook post published: %s", result.get("id"))

    asyncio.run(_post())
