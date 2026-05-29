"""Legalization document module — extend template_type_enum + legalization columns on generated_documents

Revision ID: 0015
Revises: 0014
Create Date: 2026-04-04
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# New legalization template type values
_NEW_TEMPLATE_TYPES = [
    "oswiadczenie",
    "permit_a",
    "permit_b",
    "permit_seasonal",
    "residence_prep",
]


_OSWIADCZENIE_HTML = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Oświadczenie o powierzeniu pracy cudzoziemcowi</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; margin: 2cm; }
  h1 { font-size: 14pt; text-align: center; margin-bottom: 1.5em; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
  td, th { border: 1px solid #000; padding: 4px 8px; vertical-align: top; }
  th { background: #f0f0f0; text-align: left; width: 40%; }
  .section { margin-top: 1.5em; font-weight: bold; }
  .signature { margin-top: 3em; }
</style>
</head>
<body>
<h1>Oświadczenie o powierzeniu wykonywania pracy cudzoziemcowi</h1>

<p class="section">I. DANE PODMIOTU POWIERZAJĄCEGO PRACĘ</p>
<table>
  <tr><th>Nazwa podmiotu</th><td>{{client.company_name}}</td></tr>
  <tr><th>NIP</th><td>{{client.nip}}</td></tr>
  <tr><th>Adres siedziby</th><td>{{client.address}}, {{client.city}}, {{client.country}}</td></tr>
</table>

<p class="section">II. DANE CUDZOZIEMCA</p>
<table>
  <tr><th>Imię i nazwisko</th><td>{{worker.full_name}}</td></tr>
  <tr><th>Data urodzenia</th><td>{{worker.date_of_birth}}</td></tr>
  <tr><th>Płeć</th><td>{{worker.gender}}</td></tr>
  <tr><th>Obywatelstwo</th><td>{{worker.citizenship}}</td></tr>
  <tr><th>Rodzaj dokumentu podróży</th><td>{{worker.travel_document_type}}</td></tr>
  <tr><th>Seria dokumentu</th><td>{{worker.travel_document_series}}</td></tr>
  <tr><th>Numer dokumentu</th><td>{{worker.travel_document_number}}</td></tr>
  <tr><th>Data wydania dokumentu</th><td>{{worker.travel_document_issue_date}}</td></tr>
  <tr><th>Data ważności dokumentu</th><td>{{worker.travel_document_expiry}}</td></tr>
  <tr><th>Adres zamieszkania</th><td>{{worker.address}}</td></tr>
</table>

<p class="section">III. WARUNKI ZATRUDNIENIA</p>
<table>
  <tr><th>Stanowisko</th><td>{{assignment.position}}</td></tr>
  <tr><th>Data rozpoczęcia pracy</th><td>{{assignment.start_date}}</td></tr>
  <tr><th>Data zakończenia pracy</th><td>{{assignment.end_date}}</td></tr>
</table>

<p>
Oświadczam, że powyższe informacje są zgodne z prawdą i że cudzoziemiec będzie wykonywał
pracę na warunkach określonych w niniejszym oświadczeniu.
</p>

<div class="signature">
  <p>Data: {{generated_date}}</p>
  <p>Podpis: ______________________________</p>
  <p>Pieczęć pracodawcy: ______________________________</p>
</div>
</body>
</html>"""


def upgrade() -> None:
    # 1. Extend the template_type_enum with legalization document types.
    #    Each ADD VALUE must be a separate statement in PostgreSQL.
    conn = op.get_bind()
    for value in _NEW_TEMPLATE_TYPES:
        conn.execute(
            sa.text(f"ALTER TYPE template_type_enum ADD VALUE IF NOT EXISTS '{value}'")
        )

    # 2. Add legalization status tracking columns to generated_documents.
    op.add_column(
        "generated_documents",
        sa.Column("legalization_status", sa.Text, nullable=True),
    )
    op.add_column(
        "generated_documents",
        sa.Column("legalization_filed_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "generated_documents",
        sa.Column("legalization_approved_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "generated_documents",
        sa.Column("legalization_expires_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    # 3. Seed the oświadczenie template (insert if not already present).
    conn.execute(
        sa.text(
            "INSERT INTO document_templates (id, name, template_type, body_html, is_active, version) "
            "SELECT uuid_generate_v4(), :name, :template_type, :body_html, true, 1 "
            "WHERE NOT EXISTS (SELECT 1 FROM document_templates WHERE name = :name)"
        ),
        {
            "name": "Oświadczenie o powierzeniu pracy cudzoziemcowi",
            "template_type": "oswiadczenie",
            "body_html": _OSWIADCZENIE_HTML,
        },
    )


def downgrade() -> None:
    # Drop legalization columns (enum values cannot be removed in PostgreSQL without recreation)
    op.drop_column("generated_documents", "legalization_expires_at")
    op.drop_column("generated_documents", "legalization_approved_at")
    op.drop_column("generated_documents", "legalization_filed_at")
    op.drop_column("generated_documents", "legalization_status")
