from workers.celery_app import celery_app


@celery_app.task
def placeholder_task(message: str) -> str:
    """Placeholder task — replace with real tasks as the platform grows."""
    return f"processed: {message}"
