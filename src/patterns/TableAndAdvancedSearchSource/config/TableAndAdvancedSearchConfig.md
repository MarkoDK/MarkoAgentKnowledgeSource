# TableAndAdvancedSearchConfig
Uputstvo agentu. Menjaj željene sekcije običnim rečenicama; nije runtime šema.

## Stranica
Naslov: Pregled stavki. Jedinstveni tableName: items.
Poveži sa rutom koju navedem; ne dodaj sam novu navigaciju.

## Gornji toolbar
Brza pretraga: uključena, placeholder „Šifra ili naziv”, po code i title.
Napredna pretraga: uključena. Debounce brze pretrage: 500 ms.

## Tabela
Kolone: Šifra (code), Naziv (title), obe sortirajuće.
15 redova po strani. Dugi tekst: ellipsis i pun tekst na hover/fokus.
Prazno polje: /. Bez dodatnog internog table toolbara.

## Napredni filteri
Naziv: CoreInput; title sadrži unos. Primena tek na „Pretraži”.
Reset briše napredne filtere. Na mobilnom se otvara fullscreen, ne ispod tabele.

## Header Buttons
Nema. Ovde kasnije opiši svoje Buttons i šta otvaraju/rade.

## Akcije reda
Nema. Ovde kasnije opiši svoje akcije; koriste standardne Core ikonice.

## Podaci
Default je prazna lista, bez API-ja i bez mock podataka u patternu.
Preview podaci su van patterna. Stvarni API poveži samo kada ga navedem.

---
Primer dopune (nije zahtev za default): „Dodaj Kreiraj automobil u header.
Otvara CoreCentralModal sa selectom Marka i inputima Model, Registracija i Godište.
Sačuvaj ostaje disabled dok API nije povezan.”
Možeš zadati bilo koji naziv/akciju; agent dodaje samo traženi JSX i ponašanje.
