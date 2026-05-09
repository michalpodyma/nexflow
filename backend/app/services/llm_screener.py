"""
OpenClaw LLM-driven WhatsApp screener.

Replaces the hardcoded FSM when WHATSAPP_SCREENER_USE_LLM=true.
The FSM remains in place as fallback.

Architecture
────────────
- Calls OpenRouter (OpenAI-compatible) with tool-call enforcement.
- Tools are the only way the LLM updates screening state — no free-text scoring.
- Full LLM transcript (requests + responses + tool calls) is appended to
  session.llm_log (JSONB) for GDPR audit.
- Scoring reuses compute_score() from chatbot_fsm after mapping enum levels to
  the existing numeric option keys.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

import httpx

from app.config import settings
from app.models.enums import ScreeningStatus
from app.services.chatbot_fsm import compute_score
from app.services.llm_screener_prompt import SYSTEM_PROMPT

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.models.candidates import Candidate
    from app.models.chatbot import ChatbotSession

logger = logging.getLogger(__name__)

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Map LLM enum levels → chatbot_fsm numeric keys used by compute_score()
_EXPERIENCE_MAP: dict[str, str] = {
    "none": "1",
    "lt1y": "2",
    "1to3y": "3",
    "gt3y": "4",
}
_AVAILABILITY_MAP: dict[str, str] = {
    "asap": "1",
    "1to2w": "2",
    "1mo": "3",
    "gt1mo": "4",
    "web_form": "web_form",
}
_RELOCATION_MAP: dict[str, str] = {
    "anywhere": "1",
    "with_accom": "2",
    "local_only": "3",
}

_REQUIRED_FIELDS = {"experience", "availability", "relocation"}

_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "set_experience",
            "description": "Record the candidate's relevant work experience level.",
            "parameters": {
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "enum": ["none", "lt1y", "1to3y", "gt3y"],
                    }
                },
                "required": ["level"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_availability",
            "description": "Record when the candidate can start work.",
            "parameters": {
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "enum": ["asap", "1to2w", "1mo", "gt1mo", "web_form"],
                    }
                },
                "required": ["level"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_relocation",
            "description": "Record the candidate's relocation willingness.",
            "parameters": {
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "enum": ["anywhere", "with_accom", "local_only"],
                    }
                },
                "required": ["level"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_salary",
            "description": "Record the candidate's salary expectation in PLN (optional).",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount_pln": {"type": "number"},
                },
                "required": ["amount_pln"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "complete_session",
            "description": (
                "Finalize the screening session. Call only when experience, "
                "availability, and relocation are all set."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


# ---------------------------------------------------------------------------
# OpenRouter client
# ---------------------------------------------------------------------------


async def _call_openrouter(messages: list[dict[str, Any]]) -> dict[str, Any]:
    """Send a chat-completions request to OpenRouter and return the parsed response."""
    model = settings.openrouter_model or "stepfun/step-3.5-flash:free"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nexflow.work",
        "X-Title": "Nexflow WhatsApp Screener",
    }
    body = {
        "model": model,
        "messages": messages,
        "tools": _TOOLS,
        "tool_choice": "auto",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(_OPENROUTER_URL, headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------


def _apply_tool_call(
    name: str,
    arguments: dict[str, Any],
    answers: dict[str, str],
) -> bool:
    """
    Apply a single tool call to `answers` (mutates in-place).
    Returns True if this was a complete_session() call.
    """
    if name == "set_experience":
        level = arguments.get("level", "none")
        answers["experience"] = _EXPERIENCE_MAP.get(level, "1")
    elif name == "set_availability":
        level = arguments.get("level", "gt1mo")
        answers["availability"] = _AVAILABILITY_MAP.get(level, "4")
    elif name == "set_relocation":
        level = arguments.get("level", "local_only")
        answers["relocation"] = _RELOCATION_MAP.get(level, "3")
    elif name == "set_salary":
        answers["salary"] = str(arguments.get("amount_pln", ""))
    elif name == "complete_session":
        return True
    return False


# ---------------------------------------------------------------------------
# Session completion (mirrors chatbot_fsm._complete_session)
# ---------------------------------------------------------------------------


async def _finalize_session(
    session: "ChatbotSession",
    candidate: "Candidate",
    answers: dict[str, str],
    messages: list[dict],
    db: "AsyncSession",
) -> None:
    """Compute score, update session and candidate, commit."""
    from app.models.enums import ScreeningStatus  # local import avoids circular

    now = datetime.now(tz=timezone.utc)
    score = compute_score(answers)
    passed = score >= 70

    session.session_state = {"step": "complete", "answers": answers}
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
        "[llm_screener] Session %s finalized — candidate %s score=%d status=%s",
        session.id,
        candidate.id,
        score,
        candidate.screening_status,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def advance(
    session: "ChatbotSession",
    candidate: "Candidate",
    user_text: str,
    db: "AsyncSession",
) -> str:
    """
    Process an inbound WhatsApp message with the LLM screener.

    Mirrors the signature of chatbot_fsm.advance() so the webhook can swap
    implementations behind the WHATSAPP_SCREENER_USE_LLM flag.
    """
    state: dict = dict(session.session_state or {})
    step: str = state.get("step", "")
    answers: dict[str, str] = dict(state.get("answers") or {})
    transcript: list[dict] = list(session.messages or [])
    llm_log: list[dict] = list(getattr(session, "llm_log", None) or [])

    now_iso = datetime.now(tz=timezone.utc).isoformat()

    # Already complete — echo a brief message
    if step == "complete":
        return "You've already completed the screening. A recruiter will be in touch soon."

    # Handle template_sent: the user just replied to the welcome template.
    # We don't send a second greeting — just start the LLM turn from here.
    if step == "template_sent":
        state.pop("next_step", None)
        # Carry over pre-seeded availability from web form
        if state.get("answers"):
            answers.update(state["answers"])
        state["step"] = "llm_active"
        state["answers"] = answers

    # Build OpenAI-format message history from stored transcript.
    # We include only bot/user turns (skip template placeholders).
    oai_messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in transcript:
        role = "assistant" if msg.get("role") == "bot" else "user"
        text = msg.get("text", "")
        if text and not text.startswith("[template:"):
            oai_messages.append({"role": role, "content": text})

    # Append the current user message
    transcript.append({"role": "user", "text": user_text, "ts": now_iso})
    oai_messages.append({"role": "user", "content": user_text})

    # Call OpenRouter
    try:
        response = await _call_openrouter(oai_messages)
    except Exception as exc:  # noqa: BLE001
        logger.exception("[llm_screener] OpenRouter call failed: %s", exc)
        return "Sorry, I'm having a technical issue. Please try again in a moment."

    # Audit log — request
    llm_log.append({
        "type": "llm_request",
        "ts": now_iso,
        "model": settings.openrouter_model,
        "message_count": len(oai_messages),
    })

    choice = (response.get("choices") or [{}])[0]
    message = choice.get("message", {})
    reply_text: str = message.get("content") or ""
    tool_calls: list[dict] = message.get("tool_calls") or []

    # Audit log — response
    llm_log.append({
        "type": "llm_response",
        "ts": datetime.now(tz=timezone.utc).isoformat(),
        "content": reply_text,
        "tool_calls": [
            {
                "name": tc.get("function", {}).get("name"),
                "arguments": tc.get("function", {}).get("arguments"),
            }
            for tc in tool_calls
        ],
        "usage": response.get("usage"),
    })

    # Process tool calls
    should_complete = False
    for tc in tool_calls:
        fn = tc.get("function", {})
        name = fn.get("name", "")
        try:
            args = json.loads(fn.get("arguments") or "{}")
        except json.JSONDecodeError:
            args = {}
        if _apply_tool_call(name, args, answers):
            should_complete = True

    # Auto-complete when all required fields are present (even without explicit tool call)
    if _REQUIRED_FIELDS.issubset(answers.keys()):
        should_complete = True

    state["answers"] = answers
    state["step"] = "complete" if should_complete else "llm_active"

    # Fallback reply if LLM returned no text (tool-call-only turns)
    if not reply_text:
        if should_complete:
            reply_text = "Thank you! Your screening is complete. A recruiter will contact you soon. 🎉"
        else:
            reply_text = "Could you tell me a bit more about your experience and availability?"

    # Persist transcript
    transcript.append({"role": "bot", "text": reply_text, "ts": datetime.now(tz=timezone.utc).isoformat()})
    session.session_state = state
    session.messages = transcript
    session.llm_log = llm_log  # type: ignore[attr-defined]

    if should_complete:
        await _finalize_session(session, candidate, answers, transcript, db)
    else:
        await db.commit()

    return reply_text
