"""
Facebook Page posting service.

Uses Meta Graph API v19.0 to post text and photo updates to the configured
Facebook Page.  Mirrors the pattern used in services/whatsapp.py.
"""

import logging

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

_GRAPH_BASE = "https://graph.facebook.com/v19.0"


def _check_configured() -> None:
    if not settings.fb_page_access_token or not settings.fb_page_id:
        raise HTTPException(status_code=503, detail="Facebook integration not configured")


async def post_text(message: str) -> dict:
    """POST a text update to /{page_id}/feed.

    Returns {"id": "<post_id>"} on success.
    Raises HTTPException(502) on Graph API errors.
    """
    _check_configured()

    url = f"{_GRAPH_BASE}/{settings.fb_page_id}/feed"
    payload = {
        "message": message,
        "access_token": settings.fb_page_access_token,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url, json=payload)
        except httpx.HTTPError as exc:
            logger.error("Facebook Graph API request failed: %s", exc)
            raise HTTPException(status_code=502, detail="Facebook API unreachable") from exc

    if not response.is_success:
        logger.error(
            "Facebook Graph API error %s: %s", response.status_code, response.text
        )
        raise HTTPException(status_code=502, detail="Facebook Graph API error")

    data = response.json()
    logger.info("Facebook text post created: %s", data.get("id"))
    return data


async def post_photo(caption: str, image_url: str) -> dict:
    """POST a photo to /{page_id}/photos.

    Returns {"id": "<post_id>"} on success.
    Raises HTTPException(502) on Graph API errors.
    """
    _check_configured()

    url = f"{_GRAPH_BASE}/{settings.fb_page_id}/photos"
    payload = {
        "url": image_url,
        "caption": caption,
        "access_token": settings.fb_page_access_token,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(url, json=payload)
        except httpx.HTTPError as exc:
            logger.error("Facebook Graph API request failed: %s", exc)
            raise HTTPException(status_code=502, detail="Facebook API unreachable") from exc

    if not response.is_success:
        logger.error(
            "Facebook Graph API error %s: %s", response.status_code, response.text
        )
        raise HTTPException(status_code=502, detail="Facebook Graph API error")

    data = response.json()
    logger.info("Facebook photo post created: %s", data.get("id"))
    return data
