#!/usr/bin/env python3
"""
KRS scraper — import 200+ warehouse/logistics leads into HubSpot.

Queries the Polish KRS API (api.krs.ms.gov.pl) for companies by PKD sector
code, deduplicates against existing HubSpot contacts by NIP, and imports
qualified leads with lifecyclestage=lead.

Falls back to Rejestr.io API when KRS is unreliable.

Usage:
    python scripts/krs_import.py

Required env vars:
    HUBSPOT_PRIVATE_APP_TOKEN  — HubSpot private app bearer token

Optional env vars:
    RATE_LIMIT_DELAY           — seconds between KRS API pages (default: 0.5)
    REJESTR_IO_API_KEY         — enables Rejestr.io fallback when KRS fails

Output:
    scripts/krs_leads_import.csv  — audit CSV of all imported leads
"""

from __future__ import annotations

import asyncio
import csv
import logging
import os
import sys
import time
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any

import httpx

# Ensure project scripts/lib is importable regardless of cwd
sys.path.insert(0, str(Path(__file__).parent))

from lib.hubspot import batch_create_contacts, search_contacts_by_nip

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

KRS_BASE = "https://api.krs.ms.gov.pl/api/v1"
REJESTR_BASE = "https://api.rejestr.io/v2"

# Target PKD sector codes
PKD_CODES = ["52.10", "49.41", "78.20"]

# Geographic filter — voivodeship names (lowercase, partial match on API address)
# Covers Lower Silesia, Lubusz, Greater Poland
TARGET_VOIVODESHIPS = ["dolnośląskie", "lubuskie", "wielkopolskie"]

RATE_LIMIT_DELAY = float(os.environ.get("RATE_LIMIT_DELAY", "0.5"))
REJESTR_IO_API_KEY = os.environ.get("REJESTR_IO_API_KEY", "")

OUTPUT_CSV = Path(__file__).parent / "krs_leads_import.csv"

MIN_LEADS = 200
BATCH_SIZE = 100  # HubSpot batch create limit

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Company:
    name: str
    nip: str
    krs_number: str
    address: str
    city: str
    postal_code: str
    pkd_code: str
    source: str = "krs"

    def to_hubspot_properties(self) -> dict[str, str]:
        return {
            "company": self.name,
            "city": self.city,
            "zip": self.postal_code,
            "address": self.address,
            "lifecyclestage": "lead",
            # custom properties expected to exist in HubSpot account:
            "nip": self.nip,
            "krs_number": self.krs_number,
            "pkd_code": self.pkd_code,
        }

    def to_csv_row(self) -> dict[str, str]:
        return {
            "name": self.name,
            "nip": self.nip,
            "krs_number": self.krs_number,
            "address": self.address,
            "city": self.city,
            "postal_code": self.postal_code,
            "pkd_code": self.pkd_code,
            "source": self.source,
        }


CSV_FIELDNAMES = [f.name for f in fields(Company)]


# ---------------------------------------------------------------------------
# KRS API helpers
# ---------------------------------------------------------------------------

def _is_target_region(address_str: str) -> bool:
    """Return True if the address string contains a target voivodeship."""
    lower = address_str.lower()
    return any(v in lower for v in TARGET_VOIVODESHIPS)


def _parse_krs_company(record: dict[str, Any], pkd_code: str) -> Company | None:
    """
    Parse a single KRS API record into a Company.
    Returns None if required fields are missing.
    """
    try:
        name = (
            record.get("name")
            or record.get("nazwa")
            or record.get("companyName")
            or ""
        ).strip()
        nip = (
            record.get("nip")
            or record.get("taxId")
            or ""
        ).replace("-", "").replace(" ", "").strip()
        krs_number = (
            record.get("krs")
            or record.get("krsNumber")
            or record.get("registrationNumber")
            or ""
        ).strip()

        # Address may be nested
        addr_obj = record.get("address") or record.get("registeredAddress") or {}
        if isinstance(addr_obj, dict):
            street = addr_obj.get("street") or addr_obj.get("ulica") or ""
            building = addr_obj.get("building") or addr_obj.get("nrDomu") or ""
            city = (addr_obj.get("city") or addr_obj.get("miejscowosc") or "").strip()
            postal_code = (
                addr_obj.get("postalCode")
                or addr_obj.get("kodPocztowy")
                or ""
            ).strip()
            address = f"{street} {building}".strip() if (street or building) else addr_obj.get("fullAddress", "")
            voivodeship = (
                addr_obj.get("voivodeship")
                or addr_obj.get("wojewodztwo")
                or ""
            )
        else:
            # flat string address
            address = str(addr_obj)
            city = ""
            postal_code = ""
            voivodeship = ""

        if not name or not nip:
            return None

        # Geographic filter — check voivodeship field or fall back to address string
        region_str = voivodeship or f"{city} {address}"
        if not _is_target_region(region_str):
            return None

        return Company(
            name=name,
            nip=nip,
            krs_number=krs_number,
            address=address,
            city=city,
            postal_code=postal_code,
            pkd_code=pkd_code,
            source="krs",
        )
    except Exception as exc:
        log.error("Failed to parse KRS record: %s — %s", record, exc, exc_info=False)
        return None


async def fetch_krs_companies(
    client: httpx.AsyncClient,
    pkd_code: str,
) -> list[Company]:
    """Paginate through KRS API results for one PKD code."""
    companies: list[Company] = []
    page = 1
    consecutive_errors = 0

    while True:
        url = f"{KRS_BASE}/companies"
        params = {"pkd": pkd_code, "per_page": 100, "page": page}
        try:
            resp = await client.get(url, params=params, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
            consecutive_errors = 0
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            consecutive_errors += 1
            log.error(
                "KRS API error (pkd=%s page=%d): %s", pkd_code, page, exc,
                file=sys.stderr if False else None,
            )
            if consecutive_errors >= 3:
                log.error("3 consecutive KRS errors for pkd=%s — stopping pagination", pkd_code)
                break
            await asyncio.sleep(RATE_LIMIT_DELAY * 2)
            continue

        # Support both {"data": [...]} and plain list responses
        records: list[dict[str, Any]] = []
        if isinstance(data, list):
            records = data
        elif isinstance(data, dict):
            records = (
                data.get("data")
                or data.get("results")
                or data.get("companies")
                or []
            )

        if not records:
            break

        for record in records:
            company = _parse_krs_company(record, pkd_code)
            if company:
                companies.append(company)

        log.info("KRS pkd=%s page=%d → %d records, %d kept so far", pkd_code, page, len(records), len(companies))

        # Stop if page returned fewer than per_page (last page)
        if len(records) < 100:
            break

        page += 1
        await asyncio.sleep(RATE_LIMIT_DELAY)

    return companies


# ---------------------------------------------------------------------------
# Rejestr.io fallback helpers
# ---------------------------------------------------------------------------

def _parse_rejestr_company(record: dict[str, Any], pkd_code: str) -> Company | None:
    """Parse a Rejestr.io record. Field names differ from KRS."""
    try:
        name = (record.get("name") or record.get("nazwa") or "").strip()
        nip = (record.get("nip") or "").replace("-", "").replace(" ", "").strip()
        krs_number = (record.get("krs") or "").strip()

        address_parts = record.get("address") or {}
        if isinstance(address_parts, dict):
            street = address_parts.get("street", "")
            building = address_parts.get("number", "")
            city = address_parts.get("city", "").strip()
            postal_code = address_parts.get("postCode", "").strip()
            voivodeship = address_parts.get("voivodeship", "")
            address = f"{street} {building}".strip()
        else:
            address = str(address_parts)
            city = ""
            postal_code = ""
            voivodeship = ""

        if not name or not nip:
            return None

        region_str = voivodeship or f"{city} {address}"
        if not _is_target_region(region_str):
            return None

        return Company(
            name=name,
            nip=nip,
            krs_number=krs_number,
            address=address,
            city=city,
            postal_code=postal_code,
            pkd_code=pkd_code,
            source="rejestr.io",
        )
    except Exception as exc:
        log.error("Failed to parse Rejestr.io record: %s — %s", record, exc)
        return None


async def fetch_rejestr_companies(
    client: httpx.AsyncClient,
    pkd_code: str,
) -> list[Company]:
    """Paginate through Rejestr.io API for one PKD code."""
    if not REJESTR_IO_API_KEY:
        log.warning("REJESTR_IO_API_KEY not set — skipping Rejestr.io fallback")
        return []

    companies: list[Company] = []
    page = 1
    headers = {"Authorization": f"Bearer {REJESTR_IO_API_KEY}"}

    while True:
        url = f"{REJESTR_BASE}/companies"
        params = {"pkd": pkd_code, "limit": 100, "page": page}
        try:
            resp = await client.get(url, params=params, headers=headers, timeout=30.0)
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            log.error("Rejestr.io error (pkd=%s page=%d): %s", pkd_code, page, exc)
            break

        records: list[dict[str, Any]] = (
            data.get("data") or data.get("results") or (data if isinstance(data, list) else [])
        )

        if not records:
            break

        for record in records:
            company = _parse_rejestr_company(record, pkd_code)
            if company:
                companies.append(company)

        log.info("Rejestr.io pkd=%s page=%d → %d records, %d kept", pkd_code, page, len(records), len(companies))

        if len(records) < 100:
            break

        page += 1
        await asyncio.sleep(RATE_LIMIT_DELAY)

    return companies


# ---------------------------------------------------------------------------
# Main import logic
# ---------------------------------------------------------------------------

async def scrape_all_companies(client: httpx.AsyncClient) -> list[Company]:
    """Scrape all PKD codes from KRS; fall back to Rejestr.io on failure."""
    all_companies: list[Company] = []
    seen_nips: set[str] = set()

    for pkd_code in PKD_CODES:
        log.info("Fetching KRS companies for PKD %s …", pkd_code)
        krs_results = await fetch_krs_companies(client, pkd_code)

        if not krs_results and REJESTR_IO_API_KEY:
            log.warning("KRS returned no results for PKD %s — trying Rejestr.io fallback", pkd_code)
            krs_results = await fetch_rejestr_companies(client, pkd_code)

        # Deduplicate within scraped batch by NIP
        for company in krs_results:
            if company.nip and company.nip not in seen_nips:
                seen_nips.add(company.nip)
                all_companies.append(company)

    log.info("Total unique companies scraped: %d", len(all_companies))
    return all_companies


async def filter_existing_hubspot_contacts(
    client: httpx.AsyncClient,
    companies: list[Company],
) -> list[Company]:
    """Remove companies that already exist in HubSpot (matched by NIP)."""
    new_leads: list[Company] = []
    checked = 0

    for company in companies:
        if not company.nip:
            new_leads.append(company)
            continue

        try:
            existing = await search_contacts_by_nip(client, company.nip)
            if not existing:
                new_leads.append(company)
        except httpx.HTTPError as exc:
            log.error(
                "HubSpot NIP lookup failed for %s (%s): %s — including anyway",
                company.name, company.nip, exc,
            )
            new_leads.append(company)

        checked += 1
        if checked % 50 == 0:
            log.info("Dedup progress: %d / %d checked, %d new leads", checked, len(companies), len(new_leads))
        # Respect HubSpot rate limits (10 req/s for search)
        await asyncio.sleep(0.12)

    log.info("After HubSpot dedup: %d new leads (skipped %d existing)", len(new_leads), len(companies) - len(new_leads))
    return new_leads


async def import_to_hubspot(
    client: httpx.AsyncClient,
    leads: list[Company],
) -> list[Company]:
    """Batch-import leads into HubSpot. Returns successfully imported companies."""
    imported: list[Company] = []

    for i in range(0, len(leads), BATCH_SIZE):
        batch = leads[i : i + BATCH_SIZE]
        props_list = [c.to_hubspot_properties() for c in batch]

        try:
            results = await batch_create_contacts(client, props_list)
            imported.extend(batch[: len(results)])
            log.info(
                "Batch %d–%d: imported %d contacts",
                i + 1, i + len(batch), len(results),
            )
        except httpx.HTTPStatusError as exc:
            log.error(
                "Batch %d–%d HubSpot import failed (%s): %s — trying one-by-one",
                i + 1, i + len(batch), exc.response.status_code, exc.response.text,
                file=sys.stderr if False else None,
            )
            # Fall back to individual creates so partial failures don't kill the batch
            from lib.hubspot import create_contact
            for company in batch:
                try:
                    await create_contact(client, company.to_hubspot_properties())
                    imported.append(company)
                except httpx.HTTPStatusError as single_exc:
                    log.error(
                        "Failed to import %s (NIP=%s): %s",
                        company.name, company.nip, single_exc.response.text,
                    )
                await asyncio.sleep(0.2)

        await asyncio.sleep(0.5)

    return imported


def write_csv(companies: list[Company], path: Path) -> None:
    """Write companies to the audit CSV file."""
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        for company in companies:
            writer.writerow(company.to_csv_row())
    log.info("Audit CSV written: %s (%d rows)", path, len(companies))


async def main() -> None:
    start = time.monotonic()
    log.info("=== KRS Import started ===")
    log.info("Target PKD codes: %s", PKD_CODES)
    log.info("Target voivodeships: %s", TARGET_VOIVODESHIPS)
    log.info("Rate limit delay: %.2fs", RATE_LIMIT_DELAY)

    async with httpx.AsyncClient(follow_redirects=True) as client:
        # 1. Scrape companies from KRS (+ Rejestr.io fallback)
        companies = await scrape_all_companies(client)

        if not companies:
            log.error("No companies scraped — check KRS API availability and PKD codes")
            sys.exit(1)

        # 2. Deduplicate against existing HubSpot contacts
        new_leads = await filter_existing_hubspot_contacts(client, companies)

        if len(new_leads) < MIN_LEADS:
            log.warning(
                "Only %d new leads found after dedup (minimum is %d) — "
                "consider expanding PKD codes or geographic filters",
                len(new_leads), MIN_LEADS,
            )

        # 3. Import into HubSpot
        log.info("Importing %d leads into HubSpot …", len(new_leads))
        imported = await import_to_hubspot(client, new_leads)

        # 4. Write audit CSV (always — even partial results)
        write_csv(imported, OUTPUT_CSV)

    elapsed = time.monotonic() - start
    log.info(
        "=== KRS Import complete: %d / %d leads imported in %.1fs ===",
        len(imported), len(new_leads), elapsed,
    )

    if len(imported) < MIN_LEADS:
        log.warning(
            "Imported fewer than %d leads (%d). "
            "Expand geographic filter or add more PKD codes if needed.",
            MIN_LEADS, len(imported),
        )
        sys.exit(2)


if __name__ == "__main__":
    asyncio.run(main())
