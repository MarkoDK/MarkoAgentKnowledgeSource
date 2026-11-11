# CardsAndAdvancedSearchConfig

Uputstvo agentu. Menjaj sekcije običnim rečenicama; nije runtime šema.

## Stranica

Naslov: Pregled stavki. Poveži sa rutom koju navedem; ne dodaj sam novu navigaciju.

## Gornji toolbar

Brza pretraga uključena: „Šifra ili naziv”, po code i title, debounce 500 ms.
Napredna pretraga uključena; ispod 1024 px fullscreen, nikada ispod kartica.

## Sažetak kartice

Referenca: code, ispod date (već formatiran tekst). Naslov: title, ispod subtitle.
Bez dodatnih polja, poslovnog statusa ili prečice za pregled po defaultu.
Core poseduje poravnanje redova, traku, ellipsis, tooltipe i responsive raspored.

## Prošireni sadržaj

Expand uključen. Dva CorePreviewField polja: Šifra i Naziv.
Ovde opiši drugi JSX koji želiš; bez unapred ugrađenog poslovnog toka.
Za statične kartice napiši „isključi expand”.

## Napredni filteri

Naziv: CoreInput; title sadrži unos. Primena tek na Pretraži.
Reset briše samo napredni filter, ne brzu pretragu.

## Header Buttons i akcije kartice

Nema. Ovde kasnije opiši Buttons, prečicu, modal ili footer akcije koje želiš.
Nisu ograničene na create/edit/delete. Agent dodaje samo traženi konkretan JSX.

## Podaci i paginacija

Default: prazna lista, bez API-ja i bez mock podataka u patternu.
15 po strani; javni CorePagination u pagination slotu kartica, bez izbora veličine strane.
Lokalno filtriranje čuva redosled ulaznog niza. API povezuj samo kada ga navedem.

---

Primer dopune, nije default: „Kartice vozila: broj registracije + datum, naziv +
vlasnik, polja Marka i Godište, status bedž. Prečica otvara detalj vozila.
Dodaj Kreiraj automobil u header; otvara CoreCentralModal sa Markom, Modelom i
Registracijom. Sačuvaj disabled dok API nije povezan.”
