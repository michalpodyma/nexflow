"""
Worker portal JWT authentication.

Workers authenticate via phone OTP; upon success they receive a short-lived
access token with type="worker_access" and their worker_id in the "sub" claim.

Separate from the admin JWT flow so worker tokens cannot access admin endpoints.
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

_bearer_scheme = HTTPBearer()

_WORKER_REFRESH_COOKIE = "nexflow_worker_refresh"
_TOKEN_TYPE_ACCESS = "worker_access"
_TOKEN_TYPE_REFRESH = "worker_refresh"


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------


def create_worker_access_token(worker_id: UUID) -> str:
    expire = datetime.now(UTC) + timedelta(
        minutes=settings.worker_portal_access_token_expire_minutes
    )
    payload = {
        "sub": str(worker_id),
        "type": _TOKEN_TYPE_ACCESS,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_worker_refresh_token(worker_id: UUID, jti: str) -> str:
    expire = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(worker_id),
        "type": _TOKEN_TYPE_REFRESH,
        "jti": jti,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------


def set_worker_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_WORKER_REFRESH_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/worker",
    )


def clear_worker_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_WORKER_REFRESH_COOKIE, path="/api/v1/worker")


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------


def get_current_worker(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
) -> UUID:
    """
    Validate a worker Bearer access token and return the worker's UUID.

    Raises HTTP 401 if the token is missing, expired, or not a worker_access token.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        worker_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if worker_id_str is None or token_type != _TOKEN_TYPE_ACCESS:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return UUID(worker_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


CurrentWorker = Annotated[UUID, Depends(get_current_worker)]


# ---------------------------------------------------------------------------
# Refresh helper (used by the auth router)
# ---------------------------------------------------------------------------


async def refresh_worker_token(
    refresh_cookie: str | None,
    response: Response,
) -> str:
    """
    Validate a worker refresh cookie, rotate it, and return a new access token.
    Raises HTTP 401 on any validation failure.
    """
    if not refresh_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token"
        )

    try:
        payload = jwt.decode(
            refresh_cookie,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        worker_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        jti: str | None = payload.get("jti")
        if worker_id_str is None or token_type != _TOKEN_TYPE_REFRESH or jti is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    worker_id = UUID(worker_id_str)
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        stored = await redis.get(f"worker_refresh:{jti}")
        if stored is None or stored != str(worker_id):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked"
            )

        new_jti = str(uuid.uuid4())
        access_token = create_worker_access_token(worker_id)
        new_refresh_token = create_worker_refresh_token(worker_id, new_jti)

        ttl = settings.refresh_token_expire_days * 86400
        await redis.delete(f"worker_refresh:{jti}")
        await redis.setex(f"worker_refresh:{new_jti}", ttl, str(worker_id))
    finally:
        await redis.aclose()  # type: ignore[attr-defined]

    set_worker_refresh_cookie(response, new_refresh_token)
    return access_token
