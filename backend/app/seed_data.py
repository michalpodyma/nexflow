"""HTML seed data for document templates — seeded at startup in main.py."""

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

# Templates to seed on startup. Each tuple: (name, template_type, body_html)
SEED_TEMPLATES = [
    ("Umowa o pracę", "employment_contract", _UOP_HTML),
    ("Umowa zlecenie", "mandate_contract", _UZ_HTML),
    ("Oświadczenie o powierzeniu pracy cudzoziemcowi", "oswiadczenie", _OSWIADCZENIE_HTML),
]
