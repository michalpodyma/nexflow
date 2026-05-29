"""
Job board posting router.

Supports posting vacancies to OLX Business API (OAuth 2.0) and Pracuj.pl
(XML feed upload).  Both platforms are called concurrently.  If one platform
fails — credentials not configured, API unavailable, etc. — the successful
platform posting is still persisted and the error is reported in the response.
"""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID
from xml.etree.ElementTree import Element, SubElement, tostring

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.config import settings
from app.database import get_db
from app.models.enums import JobPostingPlatform, JobPostingStatus
from app.models.job_postings import JobPosting
from app.schemas.job_postings import (
    JobPostingCreate,
    JobPostingCreateResult,
    JobPostingRead,
    PaginatedJobPostings,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/job-postings", tags=["job-postings"])

# ---------------------------------------------------------------------------
# OLX Business API helpers
# ---------------------------------------------------------------------------

OLX_TOKEN_URL = "https://www.olx.pl/api/open/oauth/token"
OLX_ADVERTS_URL = "https://www.olx.pl/api/partner/adverts"


async def _olx_get_token(client: httpx.AsyncClient) -> str:
    """Obtain an OLX OAuth 2.0 bearer token via client_credentials."""
    resp = await client.post(
        OLX_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": settings.olx_client_id,
            "client_secret": settings.olx_client_secret,
            "scope": "v2 write",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15.0,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


async def _olx_post_advert(body: JobPostingCreate) -> tuple[str | None, str | None]:
    """
    Post a single advert to OLX Business API.

    Returns (external_id, listing_url) on success.
    Raises httpx.HTTPError or ValueError on failure.
    """
    if not settings.olx_client_id or not settings.olx_client_secret:
        raise ValueError("OLX credentials not configured (OLX_CLIENT_ID / OLX_CLIENT_SECRET)")

    salary_from = body.salary_min
    salary_to = body.salary_max

    payload: dict = {
        "title": body.title,
        "description": body.description,
        "category": {"id": 1607},  # "Praca" → general jobs category on OLX Poland
        "contact": {"name": "Nexflow", "phone": ""},
        "location": {"city_id": None, "district_id": None, "label": body.location or ""},
        "price": None,
        "attributes": [
            {"key": "employment_type", "value": "full-time"},
        ],
        "url": body.apply_url,
    }

    if salary_from or salary_to:
        payload["attributes"].append(
            {
                "key": "salary",
                "value": {
                    "from": salary_from,
                    "to": salary_to,
                    "currency": body.currency.value,
                },
            }
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await _olx_get_token(client)
        resp = await client.post(
            OLX_ADVERTS_URL,
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        advert_id = str(data.get("id", ""))
        listing_url = data.get("url") or data.get("links", {}).get("html")
        return advert_id or None, listing_url or None


async def _olx_delete_advert(external_id: str) -> None:
    """Expire/remove an OLX advert by its external id."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await _olx_get_token(client)
        resp = await client.delete(
            f"{OLX_ADVERTS_URL}/{external_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()


# ---------------------------------------------------------------------------
# Pracuj.pl XML feed helpers
# ---------------------------------------------------------------------------

def _build_pracuj_xml(body: JobPostingCreate) -> bytes:
    """
    Build a minimal Pracuj.pl Employer XML Feed document for a single offer.

    The feed spec requires UTF-8 encoded XML with a root <offers> element.
    """
    offers_el = Element("offers")
    offers_el.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")

    offer = SubElement(offers_el, "offer")
    SubElement(offer, "title").text = body.title
    SubElement(offer, "description").text = body.description
    SubElement(offer, "apply_url").text = body.apply_url

    if body.location:
        loc_el = SubElement(offer, "location")
        SubElement(loc_el, "city").text = body.location

    if body.salary_min or body.salary_max:
        sal_el = SubElement(offer, "salary")
        if body.salary_min:
            SubElement(sal_el, "from").text = str(body.salary_min)
        if body.salary_max:
            SubElement(sal_el, "to").text = str(body.salary_max)
        SubElement(sal_el, "currency").text = body.currency.value

    return b'<?xml version="1.0" encoding="UTF-8"?>\n' + tostring(offers_el, encoding="unicode").encode("utf-8")


async def _pracuj_post_xml(body: JobPostingCreate) -> tuple[str | None, str | None]:
    """
    Upload an XML feed to Pracuj.pl.

    Returns (external_id, listing_url) — both may be None if the feed endpoint
    does not return an identifier.
    Raises ValueError when PRACUJ_XML_FEED_URL is not configured.
    """
    if not settings.pracuj_xml_feed_url:
        raise ValueError("Pracuj.pl feed URL not configured (PRACUJ_XML_FEED_URL)")

    xml_bytes = _build_pracuj_xml(body)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            settings.pracuj_xml_feed_url,
            content=xml_bytes,
            headers={"Content-Type": "application/xml; charset=utf-8"},
        )
        resp.raise_for_status()

        # Pracuj.pl feed endpoints typically return plain-text or JSON confirmation.
        # We capture a listing id if present, otherwise store None.
        try:
            data = resp.json()
            ext_id = str(data.get("id") or data.get("offerId") or "") or None
            url = data.get("url") or data.get("listingUrl") or None
        except Exception:
            ext_id = None
            url = None

        return ext_id, url


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("", response_model=JobPostingCreateResult, status_code=201)
async def create_job_posting(
    _: CurrentUser,
    body: JobPostingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JobPostingCreateResult:
    """
    Publish a vacancy to one or both job boards concurrently.

    Each platform produces an independent DB row.  Partial success is allowed:
    if one platform fails the other's posting is still persisted and the error
    is surfaced in the `errors` map.
    """
    now = datetime.now(tz=UTC)

    async def _post_platform(platform: JobPostingPlatform) -> tuple[JobPostingPlatform, JobPosting | None, str | None]:
        try:
            if platform == JobPostingPlatform.olx:
                ext_id, listing_url = await _olx_post_advert(body)
            else:
                ext_id, listing_url = await _pracuj_post_xml(body)

            posting = JobPosting(
                platform=platform,
                external_id=ext_id,
                listing_url=listing_url,
                title=body.title,
                location=body.location,
                salary_min=body.salary_min,
                salary_max=body.salary_max,
                currency=body.currency,
                description=body.description,
                apply_url=body.apply_url,
                posted_at=now,
                status=JobPostingStatus.active,
            )
            return platform, posting, None
        except Exception as exc:  # noqa: BLE001
            logger.warning("Job board posting failed for %s: %s", platform.value, exc)
            return platform, None, str(exc)

    results = await asyncio.gather(
        *[_post_platform(p) for p in body.platforms],
        return_exceptions=False,
    )

    saved_postings: list[JobPosting] = []
    errors: dict[str, str] = {}

    for platform, posting, error in results:
        if posting is not None:
            db.add(posting)
            saved_postings.append(posting)
        if error is not None:
            errors[platform.value] = error

    if not saved_postings and errors:
        # All platforms failed — roll back and surface errors
        raise HTTPException(
            status_code=502,
            detail={"message": "All job board submissions failed", "errors": errors},
        )

    await db.commit()
    for p in saved_postings:
        await db.refresh(p)

    return JobPostingCreateResult(
        postings=[JobPostingRead.model_validate(p) for p in saved_postings],
        errors=errors,
    )


@router.get("", response_model=PaginatedJobPostings)
async def list_job_postings(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedJobPostings:
    offset = (page - 1) * page_size

    total_result = await db.execute(select(func.count()).select_from(JobPosting))
    total: int = total_result.scalar_one()

    result = await db.execute(
        select(JobPosting).order_by(JobPosting.created_at.desc()).offset(offset).limit(page_size)
    )
    items = list(result.scalars().all())

    return PaginatedJobPostings(
        items=[JobPostingRead.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{posting_id}", status_code=204)
async def expire_job_posting(
    _: CurrentUser,
    posting_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """
    Mark a posting as expired/removed and call the platform API to remove it.

    If the platform API call fails, the local record is still updated to
    `removed` so the UI reflects the intent.
    """
    result = await db.execute(select(JobPosting).where(JobPosting.id == posting_id))
    posting = result.scalar_one_or_none()
    if posting is None:
        raise HTTPException(status_code=404, detail="Job posting not found")

    if posting.status != JobPostingStatus.active:
        raise HTTPException(status_code=409, detail="Posting is not active")

    # Attempt platform removal — best-effort
    if posting.platform == JobPostingPlatform.olx and posting.external_id:
        try:
            if settings.olx_client_id and settings.olx_client_secret:
                await _olx_delete_advert(posting.external_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("OLX delete failed for %s: %s", posting.external_id, exc)

    posting.status = JobPostingStatus.removed
    await db.commit()
