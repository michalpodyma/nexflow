import asyncio
import logging
from datetime import datetime, timezone

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="post_scheduled_facebook")
def post_scheduled_facebook() -> None:
    """Drain the facebook_post_queue: publish all posts due now."""
    asyncio.run(_drain())


async def _drain() -> None:
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.facebook import FacebookPostQueue
    from app.services import facebook as fb_service

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FacebookPostQueue)
            .filter(
                FacebookPostQueue.scheduled_at <= now,
                FacebookPostQueue.posted_at.is_(None),
            )
            .order_by(FacebookPostQueue.scheduled_at)
        )
        pending = result.scalars().all()

        logger.info("facebook beat: %d post(s) due", len(pending))

        for post in pending:
            try:
                if post.image_url:
                    data = await fb_service.post_photo(caption=post.message, image_url=post.image_url)
                else:
                    data = await fb_service.post_text(message=post.message)

                post.post_id = data.get("id")
                post.post_url = f"https://www.facebook.com/{post.post_id}"
                post.posted_at = datetime.now(timezone.utc)
                await db.commit()
                logger.info("FB post published: %s", post.post_id)
            except Exception as exc:
                await db.rollback()
                logger.error("FB post failed (id=%s): %s", post.id, exc)
