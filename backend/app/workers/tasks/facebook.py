import asyncio
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="post_scheduled_facebook")
def post_scheduled_facebook() -> None:
    """Drain the facebook_post_queue: publish all posts due now."""
    from datetime import datetime, timezone

    from sqlalchemy.orm import Session

    from app.database import SessionLocal
    from app.models.facebook import FacebookPostQueue
    from app.services import facebook as fb_service

    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        pending = (
            db.query(FacebookPostQueue)
            .filter(
                FacebookPostQueue.scheduled_at <= now,
                FacebookPostQueue.posted_at.is_(None),
            )
            .order_by(FacebookPostQueue.scheduled_at)
            .all()
        )

        logger.info("facebook beat: %d post(s) due", len(pending))

        for post in pending:
            try:
                if post.image_url:
                    result = asyncio.run(
                        fb_service.post_photo(caption=post.message, image_url=post.image_url)
                    )
                else:
                    result = asyncio.run(fb_service.post_text(message=post.message))

                post.post_id = result.get("id")
                post.post_url = f"https://www.facebook.com/{post.post_id}"
                post.posted_at = datetime.now(timezone.utc)
                logger.info("FB post published: %s", post.post_id)
            except RuntimeError as exc:
                # Credentials not configured — log and stop the whole drain
                logger.error("FB service not configured: %s", exc)
                break
            except Exception as exc:
                logger.error("FB post failed (id=%s): %s", post.id, exc)
            finally:
                db.commit()
    finally:
        db.close()
