# CardsAndAdvancedSearchSource — 1.0.1

Status: kod i custom target kompilacija su provereni; `.planned` još blokira
generisanje dok ne postoje odobreni stvarni desktop/mobile screenshotovi i
završni transfer test. Preview je `/cards-search.html` u katalogu. Ne uklanjaj
zaštitu niti koristi slike drugog patterna da bi verify prošao.

Samodovoljna kompozicija: Core searchable toolbar → Core napredni panel →
Core sekcija sa CoreExpandableCards i javnim CorePagination.
Nema poslovnog modela, API-ja, router zavisnosti, tuđih projektnih putanja ili
mock podataka. Default je prazna lista sa uključenim expand-om.

## Poziv

```text
$marko-knowledge-agent Primeni CardsAndAdvancedSearchSource sa izvornim defaultom.
$marko-knowledge-agent Primeni CardsAndAdvancedSearchSource koristeći priloženi CardsAndAdvancedSearchConfig.md.
```

Jedini ljudski ulaz je [CardsAndAdvancedSearchConfig.md](config/CardsAndAdvancedSearchConfig.md).
Čitaj jasne rečenice, ne traži drugi JSON/TS config. Agent primenjuje zahtev
direktno u označene delove običnog [TSX-a](app/CardsAndAdvancedSearchPage.tsx).
Nema izvedene definicije, parsera, action registry-ja ili univerzalnog modala.

## Sve što se prenosi

[Manifest](source.manifest.json) određuje from → to mapiranje i početne hash-eve:

| Fajl                                      | Cilj                                                            | Uloga                                            |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| app/CardsAndAdvancedSearchPage.tsx        | src/features/cards-search/CardsAndAdvancedSearchPage.tsx        | scaffold, prilagođava se samo zahtevu iz configa |
| app/CardsAndAdvancedSearchPage.module.css | src/features/cards-search/CardsAndAdvancedSearchPage.module.css | fixed, bez prepisivanja/formatiranja             |
| config/CardsAndAdvancedSearchConfig.md    | src/features/cards-search/CardsAndAdvancedSearchConfig.md       | aktivno korisničko uputstvo                      |

Ovaj dokument, manifest i vizuelne reference ostaju u katalogu. U targetu
nema patterns, demo ili MockData foldera. Jedini lokalni TSX import je susedni
CSS. Potrebni su React/ReactDOM 19.3.0 i Core 0.1.12 ili noviji; verzije su
proverena osnova, ne pin. Ne instaliraj/ažuriraj pakete bez odobrenja vlasnika.
Nasleđuje se font targeta. U host entry fajlu Core style.css ide pre globalnog CSS-a.

## Prenos u novi projekat

Zadrži postojeći AGENTS.md/DesignRules i globalni marko-knowledge-agent ugovor.
Koristi standardni alat, sa stvarnom putanjom dostupnog kataloga i targeta:

```text
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs check-source --source CardsAndAdvancedSearchSource
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs plan --source CardsAndAdvancedSearchSource --target <target>
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs apply --source CardsAndAdvancedSearchSource --target <target>
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs verify --source CardsAndAdvancedSearchSource --target <target>
```

Plan mora proći pre upisa. Kolizija nije dozvola za overwrite: traži odobrenje
za konkretan fajl. Alat ne instalira zavisnosti i ne čita credential fajlove.
Po apply-u agent primenjuje dostavljeni config na PAGE, CardRow, LOCAL DATA,
CARDS, FILTERS i RESULTS delove TSX-a; sačuva isti tekst u target Config.md.
Zatim povezuje stvarnu traženu rutu i pokreće verify, lint i build.
Ako host ima AppShell, izmeni njegov dozvoljeni config ili postojeći projektni
placeholder — ne fiksni router/main i ne drugi omotač oko cele stranice:

```tsx
import { CardsAndAdvancedSearchPage } from '../cards-search/CardsAndAdvancedSearchPage'
export default function PreviewCars() {
  return <CardsAndAdvancedSearchPage />
}
```

Ne dodaj novu navigaciju/rutu bez zahteva. Sam prenos fajlova ne znači povezanu
stranicu. Sačuvaj Generated Sources zapis koji alat dodaje u AGENTS.md.

## Konfiguracija bez skrivenog znanja

- PAGE: naslov, placeholder, quickSearch, advancedSearch, expandable.
  „Ukloni ceo toolbar” isključuje oba search slota; Core uklanja površinu.
- CardRow i CARDS: konkretni domenski tipovi i običan map u javni Core item.
  Core item ima id, title, opciono reference {value, caption}, subtitle,
  fields [{id, label, value, valueTitle}], status, accent, viewAction,
  expandedContent, footer i disabled. Ne praviti sopstveni card renderer.
- reference je kompaktna kolona za šifru/datum. title/subtitle su druga kolona.
  date je već formatiran tekst; ne izmišljaj datum kada nedostaje.
  Prazno je `/`, nula nije prazno, ID ostaje stabilan kroz filter/pager.
- fields su dodatni podaci sa labelom i vrednošću. Core poseduje širine,
  zajedničke redove, ellipsis i pune tooltipe. Ne kopiraj CSS kartica u target.
- Status se dodaje samo kada je naveden: importuj CoreStatusBadge, prosledi
  status JSX sa small veličinom i isti semantički accent. Aktivno info, čekanje
  warning, završeno success, greška danger, nepoznato neutral. Poslovno
  mapiranje mora doći iz zahteva/API-ja, ne iz naziva boje.
- Prečica: viewAction {label, onClick, disabled?}; Core daje primary krug sa
  strelicom. Handler je stvarna host navigacija ili konkretan traženi modal.
  Prečica ne sme okidati expand; prava i returnTo pripadaju aplikaciji.
- expandedContent je slobodan konkretan JSX. Default sadrži dva preview polja,
  bez koraka procesa. „Isključi expand” postavlja PAGE.expandable na false,
  ne disabled; Core tada ne prikazuje expand/region. disabled blokira samo
  expand, dok viewAction.disabled kontroliše samo prečicu.
- Header Buttons, footer i modali: samo traženi Core JSX + lokalni state,
  unutar ove stranice ili tražene host komponente. Nema fabričkih create/edit/
  delete akcija. Koristi target DesignRules i jasan aria-label/tooltip.
  Bez API-ja forma može prikazati kontrole, ali Save je disabled sa razlogom.
  Destruktivna akcija koristi stvarni potvrdni obrazac; bez lažnog uspeha.
- FILTERS: dodaj samo tražena Core polja, draft/applied state i odgovarajući
  lokalni predicate ili stvarni API payload. Ne izvršavaj tekst configa kao kod.
- Props default stranice: rows (ceo lokalni niz), loading (stvarno učitavanje),
  error (stvarna korisnička poruka/JSX), headerActions (opcioni JSX).
  Za custom podatke prilagodi CardRow i njegovo mapiranje u istom TSX-u.
- API: zameni LOCAL DATA filter/slice jednim stvarnim upitom i njegovim ukupnim
  brojem. Pager ostaje kontrolisan. Ne filtriraj/paginiraj serverovu trenutnu
  stranu ponovo lokalno, ne izmišljaj endpoint, auth ili read/write dozvole.
  Za failure koristi error/retry prema hostu, ne uspešnu praznu listu.

## Ponašanje i geometrija

- Brza pretraga: 500ms od poslednjeg unosa, Enter/lupica/Clear odmah, IME čeka
  završen unos. Bez input spinnera za debounce ili lokalne podatke.
- Draft filter ne menja rezultate pre Pretraži. Otvaranje vraća applied
  vrednost. Reset briše samo napredni filter; pretraga ostaje.
- Pretraga/filter/pager zatvaraju otvorenu karticu. Jedna otvorena kartica,
  sadržaj mountovan u hidden regionu; uklanjanje zapisa unmount-uje sadržaj.
- Default filtriranje čuva ulazni redosled. Nema ugrađenog sortiranja, URL
  storage-a ili pamćenja drafta kroz promenu strane. Dodaj ih samo na zahtev.
- 15 stavki po strani. Importuj CorePagination iz javnog Core paketa i prosledi
  ga u CoreExpandableCards pagination slot. pageNumber, pageSize, totalCount i
  onPageChange su kontrolisani iz stranice; promena strane zatvara expand.
  Bez lokalnog pagera, kopiranih CoreTable klasa, deep importa ili skrivene tabele.
- Core poseduje kartice i belu listu sa gornjim/donjim separatorom; paginacija
  je izvan skrola. Ne vraćaj plavu results površinu ili lokalni header kartice.
- Header sekcije je uvek 48px; small Buttons su 32px. Višak header akcija
  skroluje u svom delu, ne povećava visinu i ne prelama naslov u novi red.
- Advanced panel je desktop desno 320px; ispod 1024px je fullscreen
  100vw/100dvh. Fokus, Escape, overlay i scroll lock poseduje Core.
  Apply/reset zatvaraju samo mobilni panel. Ne dodavati drugi modal/padding.
- CSS poseduje samo okvir stranice i razmake oko Core-a. Default expanded
  polja su 2 kolone, na telefonu 1. Font je hostov, ne preuzimaj drugi font.

## Dokazi, ograničenja i ponovna primena

TSX je scaffold: hash dokazuje početni prenos, ne zaključava razvijenu stranicu.
CSS je fixed i verify mora odbiti drift. Config mora postojati i biti neprazan.
Verify ne dokazuje da je agent ispravno protumačio prirodni tekst; zato pregledaj
konkretan JSX i testiraj svaki zahtev, uz lint/build.
Ponovni poziv menja samo tražene delove postojećeg scaffold-a, bez apply/reset-a.
Ako zahtev traži novi layout/CSS, prijavi granicu umesto tihog redizajna.

Vizuelne reference se snimaju iz ovog patterna uz Core 0.1.12, isti font i
viewport 1440×900 / 390×844. Bez stvarnih screenshotova nema tvrdnje o vizuelnoj
potvrdi. Browser samo uz dozvolu korisnika. Preview/mock podaci nisu payload.
Proveri toolbar, filter/apply/reset, 16+ zapisa/pager, dugi tekst, expand i
zatvaranje, prazan/loading/error prikaz i opcioni modal/prečicu iz configa.
Za target traži stvarni lint/build i proveru prenosa bez originalnih aplikacija.
