import os

from fastapi import APIRouter

router = APIRouter(tags=["health"])

_GIT_SHA = os.environ.get("RAILWAY_GIT_COMMIT_SHA", "unknown")[:8]


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0", "sha": _GIT_SHA}
