from workers.celery_app import celery_app


@celery_app.task(name="workers.tasks.candidates.send_sms_confirmation")
def send_sms_confirmation(candidate_id: str, phone: str | None) -> str:
    """
    Send an SMS confirmation to the candidate after intake form submission.

    Phase 1 stub — task is queued and registered but no SMS is sent.
    Replace the body with a real Twilio call in Phase 2.
    """
    return f"sms_queued: candidate={candidate_id} phone={phone}"
