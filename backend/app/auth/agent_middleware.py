"""
Agent auth: accepts either a verified JWT with type=agent_run claim,
or a plain shared secret (AGENT_API_KEY env var) for simpler deployments.
"""

import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer()

_AGENT_API_KEY = os.getenv("AGENT_API_KEY")
_JWT_SECRET = os.getenv("JWT_SECRET_KEY")


def _verify_bearer(token: str) -> None:
    """Raise 401 if the token is not an accepted agent credential."""
    # Fast path: plain shared-secret key
    if _AGENT_API_KEY and token == _AGENT_API_KEY:
        return

    # JWT path: verify signature and claim
    if not _JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Agent credentials not configured on server",
        )
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired agent token",
        )
    if payload.get("type") != "agent_run":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token type must be agent_run",
        )


def RequireAgentKey(  # noqa: N802  (FastAPI convention: Depends with capital name)
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> None:
    _verify_bearer(credentials.credentials)
