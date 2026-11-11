# DashboardSource — 1.0.1

Status: implementacija i provere koda; .planned ostaje dok ne postoje stvarni,
odobreni desktop/mobile screenshotovi i završni transfer test.
Preview u katalogu: /dashboard.html. MockData i preview nisu payload.

## Jedan poziv, jedan config

```text
$marko-knowledge-agent Primeni DashboardSource sa izvornim defaultom.
$marko-knowledge-agent Primeni DashboardSource koristeći priloženi DashboardConfig.md.
```

Jedini korisnički ulaz je config/DashboardConfig.md. Prihvati običan tekst i
sinonime; agent primenjuje uputstva u TSX-u. Nema runtime parsera, widget
registry-ja ili dodatne konfiguracione datoteke.

U oba donja reda podržani su ISKLJUČIVO:

- tabela: „tabelarno”, „redovi i kolone” i jasni ekvivalenti;
- pizza chart: „kružni”, „pie”, „donut”;
- linijski grafikon: „linijski”, „line chart”, „trend”.

„Prikaz u redovima” bez jasnog konteksta nije dozvola za običnu listu.
Ako postoji bitna nedoumica, postavi kratko pitanje usred rada, sačekaj
odgovor za taj slot i nastavi nezavisne delove. Četvrti prikaz nije podržan.
Ne pretvaraj novu poslovnu odluku ili nedostajući API u pretpostavku.

## Payload i struktura ciljnog projekta

Manifest mapira sve app fajlove u src/features/dashboard/ sa istim imenima:

- DashboardPage.tsx: scaffold; čitljiv raspored, kartice, kolone, konkretan JSX.
- DashboardWidgets.tsx: fixed; sažetak, Core panel, kompaktna semantička tabela.
- DashboardCharts.tsx: fixed; linijski SVG i pizza chart, bez dodatne biblioteke.
- DashboardPage.module.css: fixed; raspored, geometrija i responsive stilovi.
- config/DashboardConfig.md → src/features/dashboard/DashboardConfig.md: instructions.

Dokumentacija, manifest i screenshots ostaju u katalogu. Ne prenosi patterns,
preview, MockData, testove, API-je, auth ili tuđe projektne putanje.
Potrebni su React/ReactDOM 19.3.0 i Core 0.1.12 ili noviji; manifest nije pin.
Bez samostalne instalacije, downgrade-a ili promene postojećeg bootstrap-a.
Core style.css mora prethoditi globalnom CSS-u. Nasledi font hosta; ne uvodi
font paket ili globalni font override. Vizuelno poređenje zahteva isti font.

## Prenos

Po globalnom SKILL.md pokreni standardni alat:

```text
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs check-source --source DashboardSource
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs plan --source DashboardSource --target <target>
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs apply --source DashboardSource --target <target>
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs verify --source DashboardSource --target <target>
```

.planned nije dozvola da preskočiš source proveru ili ručno kopiraš fajlove.
Koliziju ne prepisuj bez eksplicitnog odobrenja za konkretan fajl.
Kad je Source otključan, primeni traženi config samo u DashboardPage.tsx i
sačuvaj aktivno korisničko uputstvo u ciljnom DashboardConfig.md.
Poveži DashboardPage sa traženom postojećom rutom/AppLayoutConfig-om;
ne pravi drugi router ili omotač cele aplikacije. Bez zahteva ne dodaj rutu.

## Mesta za konfiguraciju

SUMMARY: defaultCards je jedini izvor broja/naslova kartica. [] znači bez
gornjeg reda. „false”, „nema kartica” i „ukloni kartice” znače isto.
Za novi broj/navedene kartice promeni niz, ne uvodi zaseban count.
DashboardSummary prima card { id, title, value, description?, icon?, tone?,
onClick? }. Ikonice: archive/calendar/edit/clock/check/close; tonovi:
primary/secondary/danger. Value null je /, a 0 ostaje 0.
Do šest kartica u desktop redu, višak se prelama; tablet dve, telefon jedna.

ROW 1/ROW 2: zadrži dva obična .row grida i zameni samo traženi JSX child u
DashboardPanel-u. Ne pravi type → renderer engine. Panel prihvata title,
children, controls?, table?, state?, footerLabel?, onViewAll?.
Za tabelu postavi table; za grafikon ukloni table. Header ima 44px, grafikon
330px, tabela 326px na širokom ekranu; kontrole ne povećavaju header.
Za jedan prikaz preko celog reda koristi styles.rowFull na tom redu i ukloni
drugi panel; ne ostavljaj prazan placeholder. Ukloni neiskorišćene importe i
odvezane destructuring parametre uklonjenog slota, bez potiskivanja lint-a. Ostali red ostaje nepromenjen.

Jedan široki prikaz koji zamenjuje dva stara slota zahteva jasan izbor podataka.
Ako config ne kaže da li koristi prvi, drugi ili smisleno objedinjeni skup,
pitaj tokom rada. Ne odbacuj drugi skup niti izmišljaj način spajanja.

DATA: monthly i statuses su DashboardPoint[]:
{ id: string, label: string, value: number, shortLabel?: string, color?: string }.
Line/Pie i tabela iste serije koriste ISTE podatke. Ne izračunavaj drugi zbir
ili ne preimenuj podatke samo zbog promene tipa prikaza.
Line/Pie podržavaju nenegativne konačne vrednosti; za drugi domen zatraži
doradu, ne maskiraj negativne/NaN vrednosti u nule.
Mesečne tačke host dostavlja hronološki; period bira poslednjih 3/6/12 tačaka.
Za server period zameni slice stvarnim host upitom, bez dvostrukog filtriranja.

COLUMNS: DashboardTable<Row> prima rows, columns [{ id, title, width?,
primary?, render(row) }], rowKey, label i opcioni onOpen(row).
To je mala semantička HTML tabela sa skrivenim pristupačnim zaglavljem;
nije obična lista, CoreTable zamena ili kompletan poslovni pregled.
Default recentItems/recentActivities: { id, title, subtitle?, date?, color?,
status?: { label, variant } }. Datum je već formatiran host tekst.
Samo primary ćelija dobija stvarnu onOpen akciju. Puni tekst daje title.
Za kompletnu pretragu/paginaciju koristi zaseban odgovarajući Source.
Status je opcion, nezavisno za svaku tabelu. Kada ceo njen skup nema status,
izostavi Status kolonu i bedževe, bez rezervisane širine. Mešoviti skup zadržava
kolonu zbog zapisa koji imaju status; za nedostajuću vrednost pojedinog reda je /.
recordColor određuje i levu oznaku i ton CoreStatusBadge-a iz istog statusa;
row.color je opcioni eksplicitni override za OBA. Bez statusa je oznaka neutralno
plava, bez statusnog značenja; ne koristi row.color kao izmišljeni status.
Prazna vrednost je /; statusna semantika dolazi iz hosta, ne iz naziva boje.
Dostavljene slike reference-with-charts.png i reference-four-tables.png u
screenshots/ su dizajnerski uzori. Nisu runtime desktop/mobile potvrda patterna.

Primer zamene prvog grafikona tabelom, unutar postojećeg DashboardPanel-a:

```tsx
<DashboardTable
  rows={visibleMonths}
  columns={[
    { id: 'month', title: 'Mesec', render: (row) => row.label },
    { id: 'count', title: 'Broj', width: '104px', render: (row) => row.value },
  ]}
  rowKey={(row) => row.id}
  label="Mesečni rezultati"
/>
```

Zadrži njegov controls/state/title; postavi table na panel.
Za drugu zamenu koristi statuses, kolone Kategorija/Broj i isti postupak.
Za tabelu → grafikon mora postojati konkretno kategorija → broj mapiranje.
Ako podaci sadrže samo nazive/datume/statuse bez tražene metrike, pitaj šta
računati. Ne izmišljaj agregaciju, nule, podatke ili novu poslovnu logiku.

## Host i stanja

Props: cards, monthly, statuses, recentItems, recentActivities, states,
onViewAllItems, onViewAllActivities, onOpenRecord.
states: summary/monthly/statuses/items/activities → {loading?, error?}.
Jedan neuspešan resurs ne blokira ostale. Greška ima prednost nad loading.
Default podaci su prazni, šest kartica nema izmišljene vrednosti.
OnViewAll je disabled sa razlogom dok nije povezan; nema lažnog uspeha.
Navigacija, prava, API i retry su konkretna host integracija samo po zahtevu.

## Provera

Pregledaj scaffold prema configu; hash ne dokazuje razumevanje prirodnog jezika.
Proveri default, četiri tabele uz iste podatke, bez kartica, jedan široki panel,
dugačke nazive, 0/prazno/loading/error i dva grafikona sa odvojenim SVG ID-jevima.
Za target pokreni verify, lint i build; ne menjaj fixed fajlove radi prolaza.
Desktop/tablet/mobile: 1440×900, 1024×768, 390×844. Browser samo uz dozvolu;
bez stvarnih screenshotova nije potvrđena pixel jednakost i .planned ostaje.
