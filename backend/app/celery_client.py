"""
Thin Celery sender for the backend API.

The backend uses this client to dispatch tasks to the Celery broker without
importing the workers package (which lives in a separate container). Tasks are
identified by name string; the actual implementation lives in workers/tasks/.
"""

import os

from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# No `include` — we only send tasks here, not register them.
celery_client = Celery("nexflow", broker=REDIS_URL, backend=REDIS_URL)
celery_client.conf.update(
    task_serializer="json",
    accept_content=["json"],
)
