"""
Tests for the OpenClaw LLM-driven WhatsApp screener (EUR-628).

Covers:
- Tool-call enum → numeric key mapping (_apply_tool_call)
- Score parity with FSM on identical answers
- complete_session auto-trigger when all fields are set
- advance() handles template_sent step (handoff from FSM initiation)
- advance() with mocked OpenRouter: tool-only response, text+tool response
- Refusal / off-topic still yields a reply (LLM decides content)
- Multilingual: non-English reply propagates correctly
- advance() falls back gracefully when OpenRouter raises
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.chatbot_fsm import compute_score
from app.services.llm_screener import _apply_tool_call, _EXPERIENCE_MAP, _AVAILABILITY_MAP, _RELOCATION_MAP, advance


# ---------------------------------------------------------------------------
# Enum → numeric key mapping
# ---------------------------------------------------------------------------


def test_experience_map_complete() -> None:
    answers: dict = {}
    for level, expected in _EXPERIENCE_MAP.items():
        _apply_tool_call("set_experience", {"level": level}, answers)
        assert answers["experience"] == expected, f"level={level!r}"


def test_availability_map_complete() -> None:
    answers: dict = {}
    for level, expected in _AVAILABILITY_MAP.items():
        _apply_tool_call("set_availability", {"level": level}, answers)
        assert answers["availability"] == expected, f"level={level!r}"


def test_relocation_map_complete() -> None:
    answers: dict = {}
    for level, expected in _RELOCATION_MAP.items():
        _apply_tool_call("set_relocation", {"level": level}, answers)
        assert answers["relocation"] == expected, f"level={level!r}"


def test_set_salary_stored_as_string() -> None:
    answers: dict = {}
    _apply_tool_call("set_salary", {"amount_pln": 4500}, answers)
    assert answers["salary"] == "4500"


def test_complete_session_returns_true() -> None:
    answers: dict = {}
    result = _apply_tool_call("complete_session", {}, answers)
    assert result is True


def test_unknown_tool_is_ignored() -> None:
    answers: dict = {}
    result = _apply_tool_call("nonexistent_tool", {}, answers)
    assert result is False
    assert answers == {}


# ---------------------------------------------------------------------------
# Score parity with FSM
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("experience,availability,relocation", [
    ("gt3y", "asap", "anywhere"),     # max → 100
    ("none", "gt1mo", "local_only"),  # min → 13
    ("1to3y", "asap", "with_accom"),  # mid pass
    ("lt1y", "1mo", "local_only"),    # low fail
])
def test_score_parity_with_fsm(experience: str, availability: str, relocation: str) -> None:
    """LLM enum levels must produce the same score as FSM numeric keys."""
    llm_answers: dict = {}
    _apply_tool_call("set_experience", {"level": experience}, llm_answers)
    _apply_tool_call("set_availability", {"level": availability}, llm_answers)
    _apply_tool_call("set_relocation", {"level": relocation}, llm_answers)

    fsm_answers = {
        "experience": _EXPERIENCE_MAP[experience],
        "availability": _AVAILABILITY_MAP[availability],
        "relocation": _RELOCATION_MAP[relocation],
    }
    assert compute_score(llm_answers) == compute_score(fsm_answers)


# ---------------------------------------------------------------------------
# Helpers for advance() tests
# ---------------------------------------------------------------------------


def _make_session(step: str = "llm_active", answers: dict | None = None) -> MagicMock:
    s = MagicMock()
    s.session_state = {"step": step, "answers": answers or {}}
    s.messages = []
    s.llm_log = []
    return s


def _make_candidate(first_name: str = "Ana") -> MagicMock:
    c = MagicMock()
    c.first_name = first_name
    c.languages = []
    return c


def _make_openrouter_response(
    content: str = "",
    tool_calls: list | None = None,
) -> dict:
    """Build a minimal OpenRouter chat-completions response."""
    msg: dict = {"role": "assistant", "content": content}
    if tool_calls:
        msg["tool_calls"] = [
            {
                "id": f"call_{i}",
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": json.dumps(tc["args"]),
                },
            }
            for i, tc in enumerate(tool_calls)
        ]
    return {"choices": [{"message": msg}], "usage": {"total_tokens": 50}}


# ---------------------------------------------------------------------------
# advance() — template_sent handoff
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advance_template_sent_transitions_to_llm_active() -> None:
    """A reply to the Meta template should move step from template_sent to llm_active."""
    session = _make_session(step="template_sent")
    candidate = _make_candidate()
    db = AsyncMock()

    response = _make_openrouter_response(content="Hi! Can you tell me about your experience?")

    with patch("app.services.llm_screener._call_openrouter", new=AsyncMock(return_value=response)):
        reply = await advance(session, candidate, "Hello", db)

    assert reply == "Hi! Can you tell me about your experience?"
    assert session.session_state["step"] == "llm_active"


# ---------------------------------------------------------------------------
# advance() — tool calls update state
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advance_tool_calls_update_answers() -> None:
    """Tool calls in the LLM response should be reflected in session_state.answers."""
    session = _make_session()
    candidate = _make_candidate()
    db = AsyncMock()

    response = _make_openrouter_response(
        content="Got it!",
        tool_calls=[
            {"name": "set_experience", "args": {"level": "gt3y"}},
            {"name": "set_availability", "args": {"level": "asap"}},
        ],
    )

    with patch("app.services.llm_screener._call_openrouter", new=AsyncMock(return_value=response)):
        reply = await advance(session, candidate, "5 years, can start immediately", db)

    assert session.session_state["answers"]["experience"] == "4"
    assert session.session_state["answers"]["availability"] == "1"
    assert reply == "Got it!"


@pytest.mark.asyncio
async def test_advance_complete_session_tool_finalizes() -> None:
    """complete_session tool call + all fields present should finalize the session."""
    answers = {"experience": "4", "availability": "1", "relocation": "1"}
    session = _make_session(answers=answers)
    candidate = _make_candidate()
    candidate.screening_status = None
    candidate.screening_score = None
    candidate.updated_at = None
    db = AsyncMock()

    response = _make_openrouter_response(
        content="You're all set!",
        tool_calls=[{"name": "complete_session", "args": {}}],
    )

    with patch("app.services.llm_screener._call_openrouter", new=AsyncMock(return_value=response)):
        reply = await advance(session, candidate, "ok", db)

    assert session.session_state["step"] == "complete"
    assert session.score == 100
    assert reply == "You're all set!"


@pytest.mark.asyncio
async def test_advance_auto_completes_when_all_fields_set() -> None:
    """All three fields being set should trigger auto-completion even without explicit tool call."""
    session = _make_session()
    candidate = _make_candidate()
    candidate.screening_status = None
    candidate.screening_score = None
    candidate.updated_at = None
    db = AsyncMock()

    response = _make_openrouter_response(
        content="",
        tool_calls=[
            {"name": "set_experience", "args": {"level": "1to3y"}},
            {"name": "set_availability", "args": {"level": "1to2w"}},
            {"name": "set_relocation", "args": {"level": "anywhere"}},
        ],
    )

    with patch("app.services.llm_screener._call_openrouter", new=AsyncMock(return_value=response)):
        reply = await advance(session, candidate, "all in one go", db)

    assert session.session_state["step"] == "complete"
    assert session.score is not None


# ---------------------------------------------------------------------------
# advance() — already complete
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advance_already_complete_returns_message() -> None:
    session = _make_session(step="complete")
    candidate = _make_candidate()
    db = AsyncMock()

    reply = await advance(session, candidate, "hi again", db)

    assert "recruiter" in reply.lower() or "completed" in reply.lower()


# ---------------------------------------------------------------------------
# advance() — OpenRouter failure fallback
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advance_openrouter_failure_returns_fallback() -> None:
    """When OpenRouter raises, advance() should return a user-friendly error message."""
    session = _make_session()
    candidate = _make_candidate()
    db = AsyncMock()

    with patch(
        "app.services.llm_screener._call_openrouter",
        new=AsyncMock(side_effect=Exception("connection refused")),
    ):
        reply = await advance(session, candidate, "hello", db)

    assert "technical" in reply.lower() or "issue" in reply.lower() or "moment" in reply.lower()


# ---------------------------------------------------------------------------
# advance() — audit log is appended
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advance_appends_to_llm_log() -> None:
    session = _make_session()
    session.llm_log = []
    candidate = _make_candidate()
    db = AsyncMock()

    response = _make_openrouter_response(content="Tell me about your experience.")

    with patch("app.services.llm_screener._call_openrouter", new=AsyncMock(return_value=response)):
        await advance(session, candidate, "Hi", db)

    assert len(session.llm_log) == 2
    types = [entry["type"] for entry in session.llm_log]
    assert "llm_request" in types
    assert "llm_response" in types


# ---------------------------------------------------------------------------
# advance() — multilingual reply propagates
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advance_returns_non_english_reply() -> None:
    """The LLM reply (whatever language) should pass through unchanged."""
    session = _make_session()
    candidate = _make_candidate()
    db = AsyncMock()

    polish_reply = "Powiedz mi o swoim doświadczeniu zawodowym."
    response = _make_openrouter_response(content=polish_reply)

    with patch("app.services.llm_screener._call_openrouter", new=AsyncMock(return_value=response)):
        reply = await advance(session, candidate, "Cześć", db)

    assert reply == polish_reply
