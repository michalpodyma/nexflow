"""
HubSpot Python client — contacts / companies import helpers.

Uses the HubSpot private-app bearer token from the HUBSPOT_PRIVATE_APP_TOKEN
environment variable.
"""

from __future__ import annotations

import os
import sys
from typing import Any

import httpx

BASE_URL = "https://api.hubapi.com"
_TOKEN = os.environ.get("HUBSPOT_PRIVATE_APP_TOKEN", "")


def _headers() -> dict[str, str]:
    if not _TOKEN:
        print(
            "ERROR: HUBSPOT_PRIVATE_APP_TOKEN is not set.",
            file=sys.stderr,
        )
        sys.exit(1)
    return {
        "Authorization": f"Bearer {_TOKEN}",
        "Content-Type": "application/json",
    }


async def search_contacts_by_nip(
    client: httpx.AsyncClient,
    nip: str,
) -> list[dict[str, Any]]:
    """Return HubSpot contacts whose 'nip' property matches the given value."""
    payload: dict[str, Any] = {
        "filterGroups": [
            {
                "filters": [
                    {
                        "propertyName": "nip",
                        "operator": "EQ",
                        "value": nip,
                    }
                ]
            }
        ],
        "properties": ["nip", "company", "firstname", "lastname"],
        "limit": 10,
    }
    resp = await client.post(
        f"{BASE_URL}/crm/v3/objects/contacts/search",
        headers=_headers(),
        json=payload,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", [])


async def create_contact(
    client: httpx.AsyncClient,
    properties: dict[str, str],
) -> dict[str, Any]:
    """Create a single HubSpot contact. Raises on HTTP error."""
    resp = await client.post(
        f"{BASE_URL}/crm/v3/objects/contacts",
        headers=_headers(),
        json={"properties": properties},
    )
    resp.raise_for_status()
    return resp.json()


async def batch_create_contacts(
    client: httpx.AsyncClient,
    contacts: list[dict[str, str]],
) -> list[dict[str, Any]]:
    """
    Create up to 100 contacts in a single batch call.
    Returns the list of created contact objects.
    """
    payload = {"inputs": [{"properties": c} for c in contacts]}
    resp = await client.post(
        f"{BASE_URL}/crm/v3/objects/contacts/batch/create",
        headers=_headers(),
        json=payload,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", [])
