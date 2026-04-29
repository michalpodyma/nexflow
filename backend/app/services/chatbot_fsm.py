"""
Chatbot FSM — WhatsApp screening pipeline.

State machine
─────────────
Each ChatbotSession row carries a `session_state` JSONB column:

    {
      "step": "experience" | "availability" | "relocation" | "salary" | "complete",
      "language": "pl" | "en" | "uk" | "de" | "ru",
      "answers": {
        "experience":   "1" | "2" | "3" | "4",   # option number
        "availability": "1" | "2" | "3" | "4",
        "relocation":   "1" | "2" | "3",
        "salary":       "<free text>"              # not scored
      }
    }

Step order
──────────
  template_sent → language_selection → experience → availability → relocation → salary → complete

"Skip known fields" policy
──────────────────────────
When a session is *initiated* from the web-form intake (candidate already has
data), certain steps may be pre-seeded:
  - If candidate.languages is non-empty → language is inferred, language_selection
    skipped, first step is "experience".
  - If candidate.availability_from is set → availability is pre-answered "web_form"
    (treated as best score) and that step is skipped.

Scoring (0–100, pass ≥ 70)
──────────────────────────
  experience  (weight 45 %):
      4 (3+ yrs) → 100   3 (1–3 yrs) → 75   2 (<1 yr) → 40   1 (none) → 0
  availability (weight 35 %):
      1 (ASAP)  → 100   2 (1-2 wks) → 80   3 (1 mo) → 50   4 (>1 mo) → 20
      "web_form" → 100  (candidate provided date via form, counts as committed)
  relocation  (weight 20 %):
      1 (yes, anywhere) → 100   2 (need accom) → 70   3 (local only) → 30
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidates import Candidate
from app.models.chatbot import ChatbotSession
from app.models.enums import ChatbotChannel, ScreeningStatus
from app.services.whatsapp import send_whatsapp_message, send_whatsapp_template

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Locale loading
# ---------------------------------------------------------------------------

_LOCALES_PATH = Path(__file__).parent.parent.parent / "chatbot_locales.json"
_LANG_CODE_MAP = {"1": "pl", "2": "en", "3": "uk", "4": "de", "5": "ru"}
_DEFAULT_LANGUAGE = "en"

try:
    with _LOCALES_PATH.open(encoding="utf-8") as _fh:
        _LOCALES: dict[str, dict[str, str]] = json.load(_fh)
except Exception as exc:  # noqa: BLE001
    logger.error("[chatbot_fsm] Failed to load chatbot_locales.json: %s", exc)
    _LOCALES = {}


def _t(language: str, key: str, **kwargs: str) -> str:
    """Retrieve a localized string, falling back to English, then key."""
    lang_dict = _LOCALES.get(language) or _LOCALES.get(_DEFAULT_LANGUAGE) or {}
    template = lang_dict.get(key, key)
    if kwargs:
        return template.format(**kwargs)
    return template


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

_EXPERIENCE_SCORES = {"1": 0, "2": 40, "3": 75, "4": 100}
_AVAILABILITY_SCORES = {"1": 100, "2": 80, "3": 50, "4": 20, "web_form": 100}
_RELOCATION_SCORES = {"1": 100, "2": 70, "3": 30}


def compute_score(answers: dict[str, str]) -> int:
    """
    Compute composite screening score (0–100) from collected answers.
    Missing answers default to the lowest score for that dimension.
    """
    exp = _EXPERIENCE_SCORES.get(answers.get("experience", "1"), 0)
    avail = _AVAILABILITY_SCORES.get(answers.get("availability", "4"), 20)
    reloc = _RELOCATION_SCORES.get(answers.get("relocation", "3"), 30)
    raw = 0.45 * exp + 0.35 * avail + 0.20 * reloc
    return round(raw)


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

_STEP_ORDER = ["language_selection", "experience", "availability", "relocation", "salary"]
_VALID_OPTIONS: dict[str, set[str]] = {
    "language_selection": {"1", "2", "3", "4", "5"},
    "experience": {"1", "2", "3", "4"},
    "availability": {"1", "2", "3", "4"},
    "relocation": {"1", "2", "3"},
    # salary is free-text — any non-empty string is accepted
}


def _next_step(current: str, answers: dict[str, str]) -> str | None:
    """Return the next step to execute, or None if pipeline is complete."""
    try:
        idx = _STEP_ORDER.index(current)
    except ValueError:
        return None

    for step in _STEP_ORDER[idx + 1:]:
        if step == "language_selection":
            continue  # already handled at session start
        if step == "availability" and answers.get("availability") == "web_form":
            continue  # pre-seeded from web form
        return step
    return None  # all done


def _question_for_step(step: str, language: str) -> str:
    key_map = {
        "experience": "experience_question",
        "availability": "availability_question",
        "relocation": "relocation_question",
        "salary": "salary_question",
    }
    return _t(language, key_map[step])


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def initiate_session(
    candidate: Candidate,
    db: AsyncSession,
    channel: ChatbotChannel = ChatbotChannel.whatsapp,
) -> ChatbotSession | None:
    """
    Create a ChatbotSession for `candidate`, set the candidate to
    `chatbot_in_progress`, and send the opening WhatsApp template message.

    The first message must be an approved template (WhatsApp Business API
    requirement for business-initiated conversations). Once the user replies,
    the 24-hour customer service window opens and follow-up questions are
    sent as plain text.

    Returns the new ChatbotSession, or None if the candidate has no phone
    or is already in/past a chatbot state.
    """
    if not candidate.phone:
        logger.warning(
            "[chatbot_fsm] Candidate %s has no phone — cannot initiate session",
            candidate.id,
        )
        return None

    if candidate.screening_status not in (ScreeningStatus.new,):
        logger.info(
            "[chatbot_fsm] Candidate %s already in status %s — skipping session init",
            candidate.id,
            candidate.screening_status,
        )
        return None

    # Infer language from candidate record (first language preference from web form)
    language: str | None = None
    if candidate.languages:
        candidate_langs = [str(l).lower() for l in candidate.languages]
        for code in candidate_langs:
            if code in _LOCALES:
                language = code
                break

    # Pre-seed availability if we already have the date from web form
    answers: dict[str, str] = {}
    if candidate.availability_from is not None:
        answers["availability"] = "web_form"

    # First step is always template_sent; the actual screening step is stored
    # so advance() knows where to go when the user replies.
    next_screening_step = "experience" if language else "language_selection"
    state: dict = {
        "step": "template_sent",
        "next_step": next_screening_step,
        "language": language,
        "answers": answers,
    }

    template_text = f"[template: screening_welcome, name={candidate.first_name}]"
    session = ChatbotSession(
        candidate_id=candidate.id,
        channel=channel,
        session_state=state,
        messages=[
            {
                "role": "bot",
                "text": template_text,
                "ts": datetime.now(tz=timezone.utc).isoformat(),
            }
        ],
    )
    db.add(session)
    await db.flush()

    candidate.chatbot_session_id = session.id
    candidate.screening_status = ScreeningStatus.chatbot_in_progress
    candidate.updated_at = datetime.now(tz=timezone.utc)

    await db.commit()
    await db.refresh(session)
    await db.refresh(candidate)

    from app.services.whatsapp import normalize_phone
    phone = normalize_phone(candidate.phone)
    lang_code = language or _DEFAULT_LANGUAGE
    await send_whatsapp_template(
        to=phone,
        template_name="screening_welcome",
        language_code=lang_code,
        body_params=[candidate.first_name],
    )

    logger.info(
        "[chatbot_fsm] Session %s initiated for candidate %s (template_sent, lang=%s)",
        session.id,
        candidate.id,
        language,
    )
    return session


async def advance(
    session: ChatbotSession,
    candidate: Candidate,
    user_text: str,
    db: AsyncSession,
) -> str:
    """
    Process an inbound WhatsApp text, advance the FSM, persist state, and
    return the bot's reply text to send back.

    Side-effects:
      - Updates session.session_state and session.messages in DB
      - On completion: sets session.score, session.completed_at,
        candidate.screening_score, candidate.screening_status
    """
    state: dict = dict(session.session_state or {})
    step: str = state.get("step", "complete")
    language: str = state.get("language") or _DEFAULT_LANGUAGE
    answers: dict[str, str] = dict(state.get("answers") or {})
    messages: list[dict] = list(session.messages or [])

    now_iso = datetime.now(tz=timezone.utc).isoformat()

    # Record user message in transcript
    messages.append({"role": "user", "text": user_text, "ts": now_iso})

    user_input = user_text.strip()
    reply: str

    # ---- Already complete ---------------------------------------------------
    if step == "complete":
        reply = _t(language, "already_screened")
        messages.append({"role": "bot", "text": reply, "ts": now_iso})
        session.messages = messages
        await db.commit()
        return reply

    # ---- Template sent (user replied to welcome template) ------------------
    if step == "template_sent":
        next_step = state.get("next_step", "experience")
        state["step"] = next_step
        state.pop("next_step", None)

        if next_step == "language_selection":
            reply = _t(_DEFAULT_LANGUAGE, "language_prompt")
        else:
            reply = (
                _t(language, "welcome", first_name=candidate.first_name)
                + "\n\n"
                + _question_for_step(next_step, language)
            )

        messages.append({"role": "bot", "text": reply, "ts": now_iso})
        session.session_state = state
        session.messages = messages
        await db.commit()
        return reply

    # ---- Language selection -------------------------------------------------
    if step == "language_selection":
        if user_input not in _VALID_OPTIONS["language_selection"]:
            reply = _t(_DEFAULT_LANGUAGE, "invalid_input")
            messages.append({"role": "bot", "text": reply, "ts": now_iso})
            session.messages = messages
            await db.commit()
            return reply

        language = _LANG_CODE_MAP.get(user_input, _DEFAULT_LANGUAGE)
        state["language"] = language

        # Welcome + first real question
        next_step = _next_step("language_selection", answers)
        if next_step is None:
            # Nothing to ask (shouldn't normally happen on fresh session)
            reply, state, messages = await _complete_session(
                session, candidate, language, answers, messages, db
            )
            return reply

        state["step"] = next_step
        reply = (
            _t(language, "welcome", first_name=candidate.first_name)
            + "\n\n"
            + _question_for_step(next_step, language)
        )
        messages.append({"role": "bot", "text": reply, "ts": now_iso})
        session.session_state = state
        session.messages = messages
        await db.commit()
        return reply

    # ---- Substantive questions (experience / availability / relocation) ------
    if step in ("experience", "availability", "relocation"):
        valid = _VALID_OPTIONS[step]
        if user_input not in valid:
            reply = _t(language, "invalid_input")
            messages.append({"role": "bot", "text": reply, "ts": now_iso})
            session.messages = messages
            await db.commit()
            return reply

        answers[step] = user_input
        state["answers"] = answers

        next_step = _next_step(step, answers)
        if next_step is None:
            reply, state, messages = await _complete_session(
                session, candidate, language, answers, messages, db
            )
            return reply

        state["step"] = next_step
        reply = _question_for_step(next_step, language)
        messages.append({"role": "bot", "text": reply, "ts": now_iso})
        session.session_state = state
        session.messages = messages
        await db.commit()
        return reply

    # ---- Salary (free text) -------------------------------------------------
    if step == "salary":
        # Accept any non-empty input; don't score this field
        salary_text = user_input if user_input else "not_provided"
        answers["salary"] = salary_text
        state["answers"] = answers

        reply, state, messages = await _complete_session(
            session, candidate, language, answers, messages, db
        )
        return reply

    # Fallback — should never reach here
    reply = _t(language, "invalid_input")
    return reply


async def _complete_session(
    session: ChatbotSession,
    candidate: Candidate,
    language: str,
    answers: dict[str, str],
    messages: list[dict],
    db: AsyncSession,
) -> tuple[str, dict, list[dict]]:
    """Finalize the session, compute score, update candidate status."""
    now = datetime.now(tz=timezone.utc)
    score = compute_score(answers)
    passed = score >= 70

    state = {
        "step": "complete",
        "language": language,
        "answers": answers,
    }

    reply_key = "pass_message" if passed else "fail_message"
    reply = _t(language, reply_key, first_name=candidate.first_name)
    messages.append({"role": "bot", "text": reply, "ts": now.isoformat()})

    session.session_state = state
    session.messages = messages
    session.score = score
    session.completed_at = now

    candidate.screening_score = score
    candidate.screening_status = (
        ScreeningStatus.screened_pass if passed else ScreeningStatus.screened_fail
    )
    candidate.updated_at = now

    await db.commit()

    logger.info(
        "[chatbot_fsm] Session %s complete — candidate %s score=%d status=%s",
        session.id,
        candidate.id,
        score,
        candidate.screening_status,
    )

    return reply, state, messages
