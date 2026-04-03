"""Add document_templates and generated_documents tables with Polish seed templates

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-03

Adds:
  - document_templates — reusable HTML contract templates with {{token}} placeholders
  - generated_documents — rendered instances of templates with optional PDF data

Seed data:
  - Umowa o pracę (employment contract) — Polish labor law format
  - Umowa zlecenie (mandate/civil law contract)
"""

from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PGUUID

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ── Seed template HTML ─────────────────────────────────────────────────────────

_UOP_HTML = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; margin: 2cm; line-height: 1.6; }
  h1 { text-align: center; font-size: 16pt; margin-bottom: 0.3em; }
  h2 { font-size: 13pt; margin-top: 1.5em; margin-bottom: 0.4em; border-bottom: 1px solid #000; }
  .parties { margin: 1em 0; }
  .party-block { margin-bottom: 1em; }
  .party-label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 0.8em 0; }
  td { padding: 4px 8px; vertical-align: top; }
  td:first-child { width: 45%; font-weight: bold; }
  .signatures { margin-top: 4em; display: flex; justify-content: space-between; }
  .sig-block { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 0.4em; }
  @media print { body { margin: 1.5cm; } }
</style>
</head>
<body>

<h1>UMOWA O PRACĘ</h1>
<p style="text-align:center">zawarta w dniu <strong>{{generated_date}}</strong></p>

<h2>§ 1. Strony umowy</h2>
<div class="parties">
  <div class="party-block">
    <span class="party-label">Pracodawca:</span><br/>
    {{client.company_name}}<br/>
    NIP: {{client.nip}}<br/>
    Adres: {{client.address}}, {{client.city}}, {{client.country}}
  </div>
  <div class="party-block">
    <span class="party-label">Pracownik:</span><br/>
    {{worker.full_name}}<br/>
    Data urodzenia: {{worker.date_of_birth}}<br/>
    PESEL: {{worker.pesel}}<br/>
    Adres zamieszkania: {{worker.address}}<br/>
    Obywatelstwo: {{worker.nationality}}
  </div>
</div>

<h2>§ 2. Warunki zatrudnienia</h2>
<table>
  <tr><td>Rodzaj umowy:</td><td>Umowa o pracę na czas określony</td></tr>
  <tr><td>Stanowisko:</td><td>{{assignment.position}}</td></tr>
  <tr><td>Miejsce wykonywania pracy:</td><td>{{client.address}}, {{client.city}}</td></tr>
  <tr><td>Wymiar czasu pracy:</td><td>Pełny etat (8 godzin dziennie / 40 godzin tygodniowo)</td></tr>
  <tr><td>Data rozpoczęcia pracy:</td><td>{{assignment.start_date}}</td></tr>
  <tr><td>Data zakończenia umowy:</td><td>{{assignment.end_date}}</td></tr>
  <tr><td>Wynagrodzenie brutto:</td><td>{{assignment.hourly_rate}} PLN / godzina</td></tr>
</table>

<h2>§ 3. Obowiązki pracownika</h2>
<p>Pracownik zobowiązuje się do:</p>
<ol>
  <li>Starannego i sumiennego wykonywania powierzonych obowiązków.</li>
  <li>Przestrzegania regulaminu pracy, przepisów BHP i p.poż.</li>
  <li>Zachowania tajemnicy służbowej i poufności informacji pracodawcy.</li>
  <li>Dbałości o mienie pracodawcy.</li>
</ol>

<h2>§ 4. Obowiązki pracodawcy</h2>
<p>Pracodawca zobowiązuje się do:</p>
<ol>
  <li>Terminowego wypłacania wynagrodzenia (do 10. dnia następnego miesiąca).</li>
  <li>Zapewnienia bezpiecznych i higienicznych warunków pracy.</li>
  <li>Odprowadzania składek ZUS i zaliczek na podatek dochodowy.</li>
  <li>Udzielenia urlopu wypoczynkowego zgodnie z Kodeksem Pracy.</li>
</ol>

<h2>§ 5. Postanowienia końcowe</h2>
<p>W sprawach nieuregulowanych niniejszą umową mają zastosowanie przepisy Kodeksu Pracy oraz inne właściwe przepisy prawa polskiego. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.</p>

<div class="signatures">
  <div class="sig-block">
    Pracodawca<br/>{{client.company_name}}
  </div>
  <div class="sig-block">
    Pracownik<br/>{{worker.full_name}}
  </div>
</div>

</body>
</html>"""

_UZ_HTML = """<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; margin: 2cm; line-height: 1.6; }
  h1 { text-align: center; font-size: 16pt; margin-bottom: 0.3em; }
  h2 { font-size: 13pt; margin-top: 1.5em; margin-bottom: 0.4em; border-bottom: 1px solid #000; }
  .parties { margin: 1em 0; }
  .party-block { margin-bottom: 1em; }
  .party-label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 0.8em 0; }
  td { padding: 4px 8px; vertical-align: top; }
  td:first-child { width: 45%; font-weight: bold; }
  .signatures { margin-top: 4em; display: flex; justify-content: space-between; }
  .sig-block { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 0.4em; }
  @media print { body { margin: 1.5cm; } }
</style>
</head>
<body>

<h1>UMOWA ZLECENIE</h1>
<p style="text-align:center">zawarta w dniu <strong>{{generated_date}}</strong></p>

<h2>§ 1. Strony umowy</h2>
<div class="parties">
  <div class="party-block">
    <span class="party-label">Zleceniodawca:</span><br/>
    {{client.company_name}}<br/>
    NIP: {{client.nip}}<br/>
    Adres: {{client.address}}, {{client.city}}, {{client.country}}
  </div>
  <div class="party-block">
    <span class="party-label">Zleceniobiorca:</span><br/>
    {{worker.full_name}}<br/>
    Data urodzenia: {{worker.date_of_birth}}<br/>
    PESEL: {{worker.pesel}}<br/>
    Adres zamieszkania: {{worker.address}}<br/>
    Obywatelstwo: {{worker.nationality}}
  </div>
</div>

<h2>§ 2. Przedmiot umowy</h2>
<p>Zleceniodawca zleca, a Zleceniobiorca przyjmuje do wykonania następujące czynności:</p>
<p><strong>{{assignment.position}}</strong></p>
<p>Usługi będą świadczone w siedzibie Zleceniodawcy: {{client.address}}, {{client.city}}.</p>

<h2>§ 3. Czas trwania umowy</h2>
<table>
  <tr><td>Data rozpoczęcia:</td><td>{{assignment.start_date}}</td></tr>
  <tr><td>Data zakończenia:</td><td>{{assignment.end_date}}</td></tr>
</table>

<h2>§ 4. Wynagrodzenie</h2>
<table>
  <tr><td>Stawka godzinowa brutto:</td><td>{{assignment.hourly_rate}} PLN / godzina</td></tr>
  <tr><td>Termin wypłaty:</td><td>Do 10. dnia miesiąca następującego po miesiącu, w którym zlecenie było wykonywane</td></tr>
  <tr><td>Forma płatności:</td><td>Przelew bankowy</td></tr>
</table>

<h2>§ 5. Składki ZUS i podatek</h2>
<p>Zleceniobiorca oświadcza, że:</p>
<ol>
  <li>Niniejsza umowa <strong>☐ jest / ☑ nie jest</strong> jego jedynym tytułem ubezpieczenia.</li>
  <li>Zleceniobiorca <strong>☐ jest / ☑ nie jest</strong> studentem poniżej 26. roku życia.</li>
</ol>
<p>Zleceniodawca odprowadzi należne składki ZUS (emerytalne, rentowe, wypadkowe) oraz zaliczkę na podatek dochodowy zgodnie z obowiązującymi przepisami.</p>

<h2>§ 6. Obowiązki Zleceniobiorcy</h2>
<ol>
  <li>Wykonywanie zleconych czynności z należytą starannością.</li>
  <li>Przestrzeganie przepisów BHP obowiązujących u Zleceniodawcy.</li>
  <li>Zachowanie poufności informacji uzyskanych w związku z wykonywaniem zlecenia.</li>
</ol>

<h2>§ 7. Rozwiązanie umowy</h2>
<p>Każda ze stron może wypowiedzieć umowę z zachowaniem 7-dniowego okresu wypowiedzenia. W przypadku ważnych powodów umowa może zostać rozwiązana ze skutkiem natychmiastowym.</p>

<h2>§ 8. Postanowienia końcowe</h2>
<p>W sprawach nieuregulowanych niniejszą umową stosuje się przepisy Kodeksu Cywilnego. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.</p>

<div class="signatures">
  <div class="sig-block">
    Zleceniodawca<br/>{{client.company_name}}
  </div>
  <div class="sig-block">
    Zleceniobiorca<br/>{{worker.full_name}}
  </div>
</div>

</body>
</html>"""


def upgrade() -> None:
    # No explicit DO blocks — let SQLAlchemy's visit_enum create enum types via its
    # memo system as part of op.create_table. Using DO block + create_type=False
    # breaks because visit_enum ignores create_type when checkfirst=False.

    # ── Tables ──────────────────────────────────────────────────────────────────
    op.create_table(
        "document_templates",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "template_type",
            sa.Enum(
                "employment_contract", "mandate_contract", "annex", "other",
                name="template_type_enum",
            ),
            nullable=False,
        ),
        sa.Column("body_html", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("version", sa.Integer, nullable=False, server_default=sa.text("1")),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "generated_documents",
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "template_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("document_templates.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "worker_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("workers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assignment_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey("assignments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("rendered_html", sa.Text, nullable=False),
        sa.Column("pdf_data", sa.LargeBinary, nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "final", "signed", name="document_status_enum"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("generated_by_user", sa.String(255), nullable=True),
        sa.Column("template_name_snapshot", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index("ix_generated_documents_worker_id", "generated_documents", ["worker_id"])
    op.create_index("ix_generated_documents_template_id", "generated_documents", ["template_id"])
    op.create_index("ix_generated_documents_assignment_id", "generated_documents", ["assignment_id"])

    # ── Seed templates ───────────────────────────────────────────────────────────
    # Use CAST(... AS type) not ::type — the :: notation conflicts with SQLAlchemy's
    # bind parameter parser (it tries to treat "template_type::template_type_enum" as
    # a single bind param name and fails). CAST avoids this entirely.
    _insert_sql = sa.text(
        "INSERT INTO document_templates (id, name, template_type, body_html, is_active, version) "
        "VALUES (:id, :name, CAST(:ttype AS template_type_enum), :body_html, :is_active, :version)"
    )
    conn = op.get_bind()
    conn.execute(_insert_sql, {
        "id": str(uuid4()),
        "name": "Umowa o pracę",
        "ttype": "employment_contract",
        "body_html": _UOP_HTML,
        "is_active": True,
        "version": 1,
    })
    conn.execute(_insert_sql, {
        "id": str(uuid4()),
        "name": "Umowa zlecenie",
        "ttype": "mandate_contract",
        "body_html": _UZ_HTML,
        "is_active": True,
        "version": 1,
    })


def downgrade() -> None:
    op.drop_index("ix_generated_documents_assignment_id", "generated_documents")
    op.drop_index("ix_generated_documents_worker_id", "generated_documents")
    op.drop_index("ix_generated_documents_template_id", "generated_documents")
    op.drop_table("generated_documents")
    op.drop_table("document_templates")
    op.execute("DROP TYPE IF EXISTS document_status_enum")
    op.execute("DROP TYPE IF EXISTS template_type_enum")
