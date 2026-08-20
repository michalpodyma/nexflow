"""
HRappka contractor (client) auto-import (EUR-1575).

push_client_to_hrappka reads the Client row from the DB and POSTs it to
HRappka's /contractors/add endpoint, returning the HRappka contractor ID.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clients import Client
from app.services.hrappka_sync.auth import HRappkaClient

logger = logging.getLogger(__name__)


def build_contractor_payload(client: Client) -> dict[str, Any]:
    """Map a Nexflow Client to an HRappka contractor payload."""
    payload: dict[str, Any] = {
        "name": client.company_name,
    }
    if client.nip:
        payload["nip"] = client.nip
    if client.email:
        payload["email"] = client.email
    if client.phone:
        payload["phone"] = client.phone
    if client.address:
        payload["address"] = client.address
    if client.city:
        payload["city"] = client.city
    if client.postal_code:
        payload["postal_code"] = client.postal_code
    if client.country:
        payload["country"] = client.country
    return payload


async def push_client_to_hrappka(client_id: UUID, db: AsyncSession) -> str:
    """
    Fetch the Client from DB and push to HRappka /contractors/add.

    Returns the HRappka contractor ID on success.
    Raises on HTTP or network failure (caller updates hrappka_sync_status).
    """
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise ValueError(f"Client {client_id} not found in DB")

    payload = build_contractor_payload(client)
    logger.info(
        "[hrappka_clients] Pushing contractor for client %s (%s)",
        client_id,
        client.company_name,
    )

    hrappka = HRappkaClient()
    response = await hrappka.post("/api/contractors/add", payload)

    contractor_id = (
        str(response.get("id") or response.get("contractor_id") or "")
    )
    logger.info(
        "[hrappka_clients] Client %s synced → HRappka contractor %s",
        client_id,
        contractor_id,
    )
    return contractor_id
