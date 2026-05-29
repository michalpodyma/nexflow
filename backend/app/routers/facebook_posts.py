"""
Admin router for manually triggering Facebook Page posts.

POST /api/admin/facebook/post
  - Requires admin authentication (CurrentUser dependency).
  - Calls FacebookService to post text or photo to the configured page.
  - Returns post_id and post_url on success.
  - Returns 503 when FB credentials are not configured.
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.auth.middleware import CurrentUser
from app.services import facebook as fb_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/facebook", tags=["facebook"])


class FacebookPostRequest(BaseModel):
    message: str
    image_url: str | None = None


class FacebookPostResponse(BaseModel):
    post_id: str
    post_url: str


@router.post("/post", response_model=FacebookPostResponse)
async def create_facebook_post(
    _: CurrentUser,
    body: FacebookPostRequest,
) -> FacebookPostResponse:
    """Post a text or photo update to the configured Facebook Page."""
    if body.image_url:
        result = await fb_service.post_photo(caption=body.message, image_url=body.image_url)
    else:
        result = await fb_service.post_text(message=body.message)

    post_id: str = result["id"]
    # Graph API returns composite IDs like "page_id_post_id"; the URL uses the raw id
    post_url = f"https://www.facebook.com/{post_id}"
    return FacebookPostResponse(post_id=post_id, post_url=post_url)
