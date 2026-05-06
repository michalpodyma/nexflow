from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "nexflow",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.tasks.notifications",
        "app.workers.tasks.facebook",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        # 07:00 UTC daily — compliance document expiry reminders
        "scan-compliance-expiry-daily": {
            "task": "workers.tasks.notifications.scan_compliance_expiry",
            "schedule": crontab(hour=7, minute=0),
        },
        # 08:00 UTC daily — flip overdue invoices and notify clients
        "scan-invoice-overdue-daily": {
            "task": "workers.tasks.notifications.scan_invoice_overdue",
            "schedule": crontab(hour=8, minute=0),
        },
        # every 30 min — drain scheduled Facebook posts promptly (EUR-520)
        "post-scheduled-facebook": {
            "task": "post_scheduled_facebook",
            "schedule": crontab(minute="*/30"),
        },
    },
)
