"""
Spreadsheet hours import service.

Functions:
  parse_spreadsheet      — parse xlsx/xls/csv bytes → list of row dicts
  suggest_column_mappings — fuzzy-match spreadsheet headers → internal field names
  match_workers          — match rows to Worker records (PESEL > exact name > fuzzy name)
  validate_rows          — flag invalid hours values and missing workers
"""

import csv
import io
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

# Canonical internal field names and their Polish/common aliases for fuzzy matching
_FIELD_ALIASES: dict[str, list[str]] = {
    "worker_name": ["pracownik", "imię i nazwisko", "imie i nazwisko", "worker", "name", "nazwisko"],
    "work_date": ["data", "date", "dzień", "dzien", "data pracy"],
    "hours_worked": ["godziny", "hours", "godz", "h", "godziny pracy", "przepracowane"],
    "overtime_hours": ["nadgodziny", "overtime", "nadg", "extra hours"],
    "absence_type": ["nieobecność", "nieobecnosc", "absence", "urlop", "zwolnienie"],
    "notes": ["uwagi", "notes", "komentarz", "comment"],
    "pesel": ["pesel"],
}


def parse_spreadsheet(file_bytes: bytes, content_type: str) -> list[dict[str, Any]]:
    """Parse xlsx/xls/csv bytes. Returns list of dicts keyed by header name."""
    is_csv = (
        "csv" in content_type
        or content_type == "text/plain"
    )
    if not is_csv:
        # Try openpyxl for Excel files
        try:
            import openpyxl  # type: ignore[import-untyped]
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
            ws = wb.active
            if ws is None:
                return []
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                return []
            headers = [str(h).strip() if h is not None else "" for h in rows[0]]
            result: list[dict[str, Any]] = []
            for row in rows[1:]:
                if all(v is None for v in row):
                    continue  # skip blank rows
                result.append({
                    headers[i]: (row[i] if i < len(row) else None)
                    for i in range(len(headers))
                })
            return result
        except Exception:
            # Fall through to CSV attempt
            pass

    # CSV parsing
    text = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return [dict(row) for row in reader]


def suggest_column_mappings(
    headers: list[str],
    existing_mappings: dict[str, str],  # spreadsheet_header → internal_field
) -> dict[str, str]:
    """
    Return a mapping of spreadsheet_header → internal_field for each detected header.
    Uses saved mappings first, then falls back to rapidfuzz fuzzy matching (threshold ≥ 70).
    """
    result: dict[str, str] = {}
    try:
        from rapidfuzz import process, fuzz  # type: ignore[import-untyped]
        use_fuzzy = True
    except ImportError:
        use_fuzzy = False

    # Build flat list of (alias, field) pairs for fuzzy matching
    alias_to_field: dict[str, str] = {}
    for field, aliases in _FIELD_ALIASES.items():
        alias_to_field[field] = field  # exact field name maps to itself
        for alias in aliases:
            alias_to_field[alias] = field

    for header in headers:
        header_norm = header.strip().lower()
        # Check saved mappings first
        if header in existing_mappings:
            result[header] = existing_mappings[header]
            continue
        # Exact alias match
        if header_norm in alias_to_field:
            result[header] = alias_to_field[header_norm]
            continue
        # Fuzzy match
        if use_fuzzy:
            match = process.extractOne(
                header_norm,
                alias_to_field.keys(),
                scorer=fuzz.ratio,
                score_cutoff=70,
            )
            if match:
                result[header] = alias_to_field[match[0]]

    return result


def match_workers(
    rows: list[dict[str, Any]],
    field_mapping: dict[str, str],  # spreadsheet_header → internal_field
    worker_lookup: dict[str, Any],  # keyed by pesel and normalized full_name
) -> list[dict[str, Any]]:
    """
    Attempt to match each row to a worker. Adds 'matched_worker_id' and
    'match_method' keys to each row dict. Unmatched rows get match_method=None.

    Matching order: (1) PESEL → (2) exact name → (3) fuzzy name ≥ 90.

    worker_lookup format:
      {
        "by_pesel": {pesel: worker_id},
        "by_name": {normalized_name: worker_id},
      }
    """
    try:
        from rapidfuzz import process, fuzz  # type: ignore[import-untyped]
        use_fuzzy = True
    except ImportError:
        use_fuzzy = False

    # Invert field_mapping: internal_field → list of spreadsheet headers
    field_to_headers: dict[str, list[str]] = {}
    for header, field in field_mapping.items():
        field_to_headers.setdefault(field, []).append(header)

    def get_cell(row: dict[str, Any], field: str) -> str | None:
        for h in field_to_headers.get(field, []):
            v = row.get(h)
            if v is not None:
                return str(v).strip()
        return None

    all_names = list(worker_lookup.get("by_name", {}).keys())

    for row in rows:
        worker_id = None
        match_method = None

        pesel = get_cell(row, "pesel")
        if pesel and pesel in worker_lookup.get("by_pesel", {}):
            worker_id = worker_lookup["by_pesel"][pesel]
            match_method = "pesel"

        if worker_id is None:
            name = get_cell(row, "worker_name")
            if name:
                norm_name = name.lower()
                if norm_name in worker_lookup.get("by_name", {}):
                    worker_id = worker_lookup["by_name"][norm_name]
                    match_method = "exact_name"
                elif use_fuzzy and all_names:
                    match = process.extractOne(
                        norm_name, all_names, scorer=fuzz.token_sort_ratio, score_cutoff=90
                    )
                    if match:
                        worker_id = worker_lookup["by_name"][match[0]]
                        match_method = "fuzzy_name"

        row["matched_worker_id"] = worker_id
        row["match_method"] = match_method

    return rows


def _parse_date(value: Any) -> date | None:
    """Attempt to parse a date value from various formats."""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    s = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            from datetime import datetime as dt
            return dt.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _parse_decimal(value: Any) -> Decimal | None:
    """Parse a numeric value as Decimal."""
    if value is None:
        return None
    try:
        return Decimal(str(value).replace(",", ".").strip())
    except InvalidOperation:
        return None


def validate_rows(
    rows: list[dict[str, Any]],
    field_mapping: dict[str, str],
) -> list[dict[str, Any]]:
    """
    Validate each row. Adds 'validation_errors' (list of strings) and 'match_status' keys.
    match_status: 'matched' | 'unmatched' | 'flagged'
    """
    field_to_headers: dict[str, list[str]] = {}
    for header, field in field_mapping.items():
        field_to_headers.setdefault(field, []).append(header)

    def get_cell(row: dict[str, Any], field: str) -> Any:
        for h in field_to_headers.get(field, []):
            v = row.get(h)
            if v is not None:
                return v
        return None

    for row in rows:
        errors: list[str] = []

        # Validate work_date
        raw_date = get_cell(row, "work_date")
        parsed_date = _parse_date(raw_date)
        if raw_date is not None and parsed_date is None:
            errors.append(f"Nieprawidłowa data: '{raw_date}'")
        row["_parsed_date"] = parsed_date

        # Validate hours_worked
        raw_hours = get_cell(row, "hours_worked")
        parsed_hours = _parse_decimal(raw_hours)
        if raw_hours is not None:
            if parsed_hours is None:
                errors.append(f"Nieprawidłowa wartość godzin: '{raw_hours}'")
            elif parsed_hours <= 0:
                errors.append(f"Godziny muszą być > 0 (otrzymano {parsed_hours})")
            elif parsed_hours > 24:
                errors.append(f"Godziny przekraczają 24h/dzień (otrzymano {parsed_hours})")
        row["_parsed_hours"] = parsed_hours

        # Validate overtime_hours
        raw_ot = get_cell(row, "overtime_hours")
        parsed_ot = _parse_decimal(raw_ot)
        if raw_ot is not None and parsed_ot is None:
            errors.append(f"Nieprawidłowe nadgodziny: '{raw_ot}'")
        row["_parsed_overtime"] = parsed_ot

        # Worker matching status
        worker_id = row.get("matched_worker_id")
        row["validation_errors"] = errors

        if worker_id and not errors:
            row["match_status"] = "matched"
        elif worker_id and errors:
            row["match_status"] = "flagged"
        elif not worker_id and errors:
            row["match_status"] = "flagged"
        else:
            row["match_status"] = "unmatched"

    return rows
