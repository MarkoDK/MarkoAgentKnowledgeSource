# TableAndAdvancedSearchSource — 2.0.0

Jednostavna React stranica: Core toolbar → Core advanced panel → Core section + CoreTable.
Default nema Create/edit Buttons, akcione kolone, modal, API ili mock podatke.

## Poziv i fajlovi

```text
$marko-knowledge-agent Primeni TableAndAdvancedSearchSource sa izvornim defaultom.
$marko-knowledge-agent Primeni TableAndAdvancedSearchSource koristeći priloženi TableAndAdvancedSearchConfig.md.
```

[Config](config/TableAndAdvancedSearchConfig.md) je kratak tekst **za agenta**.
Ne prevodi ga u dodatni JSON/TS config, šemu, definiciju ili action registry.
[TSX](app/TableAndAdvancedSearchPage.tsx) je običan, čitljiv početni kod.
[CSS](app/TableAndAdvancedSearchPage.module.css) je zajednički izgled.
[source.manifest.json](source.manifest.json) je spisak prenosa:

- TSX → `src/features/table-search/TableAndAdvancedSearchPage.tsx` (projektni scaffold).
- CSS → isti folder (fixed).
- Config.md → isti folder (uputstvo za kasnije dorade).

Nema runtime foldera, posebnog hook-a, .mjs/.d.mts fajlova ili drugog UI frameworka.
Preview, MockData, slike i ovaj dokument ostaju u katalogu.

## Implementacija u blank projektu

1. Pročitaj globalni SKILL.md, target pravila/DesignRules i izabrani config.
2. Standardnim source-transfer alatom pokreni check-source → plan → apply za
   `TableAndAdvancedSearchSource`. Kolizije traže odobrenje za tačne fajlove.
   Bez instalacije ili izmene paketa; potreban je Core 0.1.10 ili noviji.
3. Prilagodi označene delove **postojećeg TSX-a** prema configu:
   PAGE (naslov/toolbar), TableRow i COLUMNS, LOCAL DATA, FILTERS, RESULTS.
   Sačuvaj dostavljeni config u prenetom Config.md. Nema drugog config workflow-a.
4. Poveži stranicu sa traženom rutom. Uz AppShell menjaj njegov dozvoljeni config
   ili postojeći projektni placeholder, ne fiksni router/main. Na primer postojeći
   PreviewCars samo renderuje ovu stranicu, bez drugog Core section omotača.
5. Verify → ciljni lint/build → provera svih zahteva iz configa.
   Sam prenos fajlova nije gotova integracija. Browser samo uz dozvolu korisnika.

```tsx
import { TableAndAdvancedSearchPage } from '../table-search/TableAndAdvancedSearchPage'

export default function PreviewCars() {
  return <TableAndAdvancedSearchPage />
}
```

U realnoj aplikaciji prosledi `rows` i stvarni `loading`. Default je prazna lista.
Jedini dodatni opcioni prop je `headerActions` (JSX). Nema ugrađenih poslovnih akcija.
Izabrani tableName mora biti jedinstven na stranici.

## Kako tumačiti custom config

- „Ukloni ceo toolbar” → isključi quickSearch i advancedSearch u PAGE;
  Core sam uklanja gornju površinu. Pojedinačni zahtev menja samo odgovarajući slot.
- Nove kolone → obične CoreTableColumn definicije i odgovarajući TableRow/cell JSX.
  Uskladi i lokalni comparator/pretragu sa novim poljima (brojevi/datumi nisu
  tekstualni localeCompare). Ne praviti svoj sistem tipova kolona.
  Poslovni status koristi CoreStatusBadge.
- Novi filteri → tražena Core polja u fields, jednostavan draft/applied state i
  stvarni filter/payload. CoreAccordion koristi samo kada je grupisanje potrebno.
- Header Buttons → dodaj samo traženi JSX unutar postojećeg headerActions prostora.
  Može kroz prop ili lokalno u stranici. Naziv nije ograničen na create/edit/delete.
- Row actions → dodaj CoreTable action kolonu samo na zahtev; CoreIconButton,
  ghost, 36px, ikona 22px/stroke 1.8, razmak 10px, desno. Koristi row.original.
  Ako akcija otvara modal, kolone mogu biti unutar komponente radi lokalnog handlera.
- Modal → tek na zahtev dodaj CoreCentralModal i konkretne Core elemente/state,
  direktno i čitljivo u tom TSX-u. Ne uvoditi univerzalni renderer modala.
  Kompaktnu formu ne širiti kao tabelarni modal. Prati target DesignRules.
- Ne izmišljaj API, potrebna polja/validacije ili posledice akcije.
  Bez API-ja modal sme imati unos, ali Save mora jasno ostati disabled sa razlogom.
  Ne prikazuj lažan uspeh. Brisanje traži postojeći potvrdni Core obrazac.
- Novi API → zameni LOCAL DATA lokalno filtriranje/sort/slice pravim upitom i
  kontrolisanim CoreTable server stanjem. Filter/sort/page šalji jednom; ne filtriraj
  serverovu stranu ponovo lokalno. Loading/greške su stvarni, bez lažnog čekanja.
  Nema automatskog ponavljanja upisa ili izmišljene auth/permissions integracije.

Ovi zahtevi su posao agenta koji čita config, ne mogućnosti nekog skrivenog parsera.
Novi običan JSX u scaffold-u je očekivana prilagodba, ne kršenje fixed-file zaštite.

## Izgled i ponašanje koje treba zadržati

- CoreAdvancedSearchLayout već daje zaseban search container; ne duplirati padding.
- Header rezultata je 48px ukupno, **i sa Buttons**. Small Buttons 32px,
  jedan red; višak akcija skroluje unutar svog dela, ne povećava header.
- CoreAdvancedSearchPanel: desktop desno 320px; ispod 1024px fullscreen 100vw/100dvh.
  Core poseduje fokus, Escape, overlay i scroll lock. Ne praviti svoj modal za filter.
- Quick search: 500ms od poslednjeg unosa; Enter/lupica i clear odmah.
  Draft filter ne menja rezultate pre primene; otvaranje vraća applied vrednost.
  Na mobilnom apply/reset zatvaraju panel; desktop ga zadržava.
- Default dobija ceo niz preko rows; Core query kontrole koriste 15 redova, lokalni
  filter/sort i slice u TSX-u. `server` ovde znači kontrolu query-ja, ne API poziv.
- Nema input spinnera za lokalnu pretragu ili čekanje debounce-a. Core loading
  prati samo stvarni loading prop. Ne simulirati request state.
- Tabela je uvučena od ivica, plava prazna površina ostaje vidljiva, pager je ispod.
  Na uskom ekranu isti CoreTable prelazi u kartični raspored, bez obaveznog horizontalnog skrola.
- Ne menjati geometriju, font ili CSS iz običnog zahteva za novu kolonu/akciju.

## Prenos i dokazi

TSX je `scaffold`: početno se kopira iz izvornika, zatim se **namerno uređuje**
prema configu. Source hash potvrđuje početni kod, ne zaključava poslovnu stranicu.
CSS je `fixed`; verify odbija njegov drift. Config mora postojati i ne sme biti prazan.
Verify nije sandbox, semantička provera configa ili dokaz da prilagođeni JSX radi.
Scaffold obavezno pregledaj i pokreni ciljni lint/TypeScript/build.

Ponovni poziv: pročitaj aktivni config i kod, primeni traženu doradu bez apply/reset-a.
Ne vraćaj razvijenu stranicu na default. Stari 1.x runtime se ne migrira naslepo:
izdvoj odobrene poslovne integracije pre pregledane zamene; ne briši korisnički kod.

Preview: `npm run dev` → `/table-search.html`; `?demo=custom` pokazuje opcioni
header Button i običan Core modal, van patterna. Podaci su u `src/MockData.ts`.

Raniji [desktop](screenshots/table-search-desktop.png) i
[mobile filter](screenshots/table-search-mobile-filter.png) screenshotovi su reference,
ne potvrda ove revision. Browser se ne otvara automatski.
Korisnik proverava 1440×900 i 390×844: search/filter/reset, sort/pager, header
bez/sa Buttons (48px), fullscreen filter, dugi tekst i praznu listu.
Automatski testovi proveravaju prenos, realni Core render i custom kompilaciju;
ne predstavljati ih kao interaktivno ili pixel-perfect prihvatanje.
