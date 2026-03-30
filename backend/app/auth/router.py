import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AdminUser
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_REFRESH_COOKIE = "nexflow_refresh"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _verify_password(plain: str, hashed: str) -> bool:
    return bool(pwd_context.verify(plain, hashed))


def _hash_password(plain: str) -> str:
    return str(pwd_context.hash(plain))


def _create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": username, "type": "access", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _create_refresh_token(username: str, jti: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {"sub": username, "type": "refresh", "jti": jti, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.refresh_token_expire_days * 86400,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_REFRESH_COOKIE, path="/auth")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    result = await db.execute(select(AdminUser).where(AdminUser.username == body.username))
    user: AdminUser | None = result.scalar_one_or_none()

    if user is None or not user.is_active or not _verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    jti = str(uuid.uuid4())
    access_token = _create_access_token(user.username)
    refresh_token = _create_refresh_token(user.username, jti)

    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        ttl = settings.refresh_token_expire_days * 86400
        await redis.setex(f"refresh:{jti}", ttl, user.username)
    finally:
        await redis.aclose()

    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, response: Response) -> TokenResponse:
    raw = request.cookies.get(_REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    try:
        payload = jwt.decode(
            raw,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        username: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        jti: str | None = payload.get("jti")
        if username is None or token_type != "refresh" or jti is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        stored = await redis.get(f"refresh:{jti}")
        if stored is None or stored != username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token revoked")

        new_jti = str(uuid.uuid4())
        access_token = _create_access_token(username)
        new_refresh_token = _create_refresh_token(username, new_jti)

        ttl = settings.refresh_token_expire_days * 86400
        await redis.delete(f"refresh:{jti}")
        await redis.setex(f"refresh:{new_jti}", ttl, username)
    finally:
        await redis.aclose()

    _set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response) -> None:
    raw = request.cookies.get(_REFRESH_COOKIE)
    if raw:
        try:
            payload = jwt.decode(
                raw,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            jti: str | None = payload.get("jti")
            if jti:
                redis = aioredis.from_url(settings.redis_url, decode_responses=True)
                try:
                    await redis.delete(f"refresh:{jti}")
                finally:
                    await redis.aclose()
        except JWTError:
            pass  # Expired/invalid tokens are silently ignored on logout
    _clear_refresh_cookie(response)
