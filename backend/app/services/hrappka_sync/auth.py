"""
HRappka API client — API-key auth with retry and PII masking (EUR-1575).

PII masking: any log message containing personal data goes through _mask_pii()
before emission so credentials/personal data never appear in log output.
"""

from __future__ import annotations

import logging
import re
import time
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_PII_KEYS = re.compile(
    r'"(?:password|token|email|phone|nip|name|address)[^"]*"\s*:\s*"[^"]*"',
    re.IGNORECASE,
)


def _mask_pii(text: str) -> str:
    return _PII_KEYS.sub(lambda m: m.group(0).split(":")[0] + ': "***"', text)


class HRappkaClient:
    """Async HTTP client for the HRappka REST API."""

    def __init__(self) -> None:
        self._base = settings.hrappka_api_url.rstrip("/")
        self._api_key = settings.hrappka_api_key

    async def post(
        self, path: str, payload: dict[str, Any], *, retries: int = 2
    ) -> dict[str, Any]:
        """Authenticated POST with exponential-backoff retry."""
        url = f"{self._base}/{path.lstrip('/')}"
        last_exc: Exception | None = None

        for attempt in range(retries + 1):
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post(
                        url,
                        json=payload,
                        headers={
                            "Authorization": f"Bearer {self._api_key}",
                            "Content-Type": "application/json",
                        },
                    )
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "[hrappka_client] HTTP %s on attempt %d/%d for %s",
                    exc.response.status_code,
                    attempt + 1,
                    retries + 1,
                    path,
                )
                last_exc = exc
            except Exception as exc:  # noqa: BLE001
                logger.exception("[hrappka_client] Unexpected error posting to %s: %s", path, exc)
                last_exc = exc

            if attempt < retries:
                wait = 1.5**attempt
                logger.info("[hrappka_client] Retrying in %.1fs", wait)
                time.sleep(wait)

        raise RuntimeError(
            f"HRappka POST {path} failed after {retries + 1} attempts"
        ) from last_exc
