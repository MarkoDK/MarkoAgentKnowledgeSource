# ProjectFoundationSource — 2.0.0

Prvi pattern novog React/TypeScript Vite projekta, pre dodavanja aplikacionog koda.
Poziv inicijalizuje projekat: uklanja sav početni sadržaj src/public i demo README,
postavlja prazan React/Core bootstrap i dodaje tri projektna pravilnika.
Ne zavisi od verzije Vite-a, imena slika ili tačnih bajtova njegovog startera.

## Poziv i config

~~~text
$marko-knowledge-agent Primeni ProjectFoundationSource.
~~~

Poziv odobrava deklarisano početno čišćenje. Nema dodatnog izbora režima.
[ProjectFoundationConfig.json](config/ProjectFoundationConfig.json) je opcioni ulaz
sa jednim documentTitle stringom (1–100 znakova). Bez priloga koristi se izvorni
primer. Naslov se HTML-escape-uje; config se ne izvršava kao program.
Za navigaciju kasnije služi zaseban AppLayoutConfig.

## Prva primena

1. Proveri stvarni root Vite projekta, source integritet i instalirane pakete.
2. Plan prikaže tačne fajlove za uklanjanje i zamenu; sam ne piše ništa.
3. Alat uklanja sve fajlove unutar src i public, uključujući App.css, hero,
   logotipe i javne demo ikonice. Uklanja početni README.md. Ne čuva demo zato
   što ima drugačije importe, novu sliku ili drugačiji sadržaj nego stariji Vite.
4. Postavlja src/App.tsx (return null), src/main.tsx, src/index.css i index.html
   sa izabranim naslovom. Core CSS se uvozi pre aplikacionog CSS-a.
5. Dopunjuje AGENTS.md i DesignRules.md i dodaje jednu stvarnu odluku u
   DecisionLog.md. Čuva sadržaj tih dokumenata van svojih označenih blokova.
6. Prazne demo foldere uklanja. Svaki zamenjen/obrisan fajl prvo dobija tačnu
   povratnu kopiju u ignorisanom .codex-tmp/project-foundation-backups/.

Git/APM, node_modules, paketi/lockfile, Vite/TypeScript/ESLint konfiguracija,
.npmrc i env fajlovi u root-u ostaju. Ne čitaj credentials. Zaštićen fajl
ili symlink unutar src/public blokira operaciju pre upisa; ne prati link van
projekta. Brisanje koristi tačno popisane fajlove, bez rekurzivnog resetovanja root-a.
Ne dodaj AppShell, feature stranice, auth ili mock podatke.

## Ponovni poziv

Zapis primene u DecisionLog.md sprečava novo čišćenje. Kasnije dodati kod,
slike, README i AppShell ostaju. Ponovni apply ne dodaje duplu odluku.
Eksplicitni config može menjati naslov samo dok je HTML još Foundation bootstrap.
Izmenjen source-managed blok ili druga revision traži pregledanu migraciju;
bez automatskog resetovanja projekta. Verzija 1.x se ne proglašava očišćenom
samo zato što je ranije dodala pravila; pri prelasku na 2.0 potreban je novi
blank test ili eksplicitno odobrena migracija početnog projekta.

## Izvršavanje i provere

Potrebni su package.json, lint/build skripte i stvarno instalirani Core,
React i React DOM u proverenim ili novijim verzijama iz manifesta. Ako nešto
nedostaje, prijavi sve nedostajuće biblioteke i komande za instalaciju.
Za Core podseti na lokalni .npmrc ili korisnički registry setup, bez čitanja
tajni. Pakete ne instaliraj niti vraćaj na stariju verziju bez odobrenja.

Agent sam izvršava, iz stvarnog .agents/skills/marko-knowledge-agent foldera
u pronađenom apm_modules paketu (ne iz ulaznog skilla u ciljnom projektu):

~~~sh
node scripts/source-transfer.mjs check-source --source ProjectFoundationSource
node scripts/source-transfer.mjs plan --source ProjectFoundationSource --target TARGET
node scripts/source-transfer.mjs apply --source ProjectFoundationSource --target TARGET
node scripts/source-transfer.mjs verify --source ProjectFoundationSource --target TARGET
~~~

Za custom JSON dodaj --config ABSOLUTE_CONFIG_PATH. Nema --replace-file režima.
Posle prenosa pokreni ciljni lint/build i dopiši stvarne rezultate u DecisionLog.
Ako upis pukne, pregledaj stanje i backup receipt pre nastavka.
Prazan root posle inicijalizacije je očekivan; browser nije potreban da bi se
potvrdilo uklanjanje demo fajlova. Build nije dokaz vizuelne jednakosti.

## Font i nastavak

Globalni CSS koristi Inter-first fallback stack, bez automatskog preuzimanja fonta.
Provereni Core 0.1.10 koristi font-family: inherit; ne isporučuje sam font aplikacije.
DesignRules je pravilnik za naredni razvoj, ne dodatna UI implementacija.
U ciljni projekat se ne prenose katalog patterns, manifest, ovaj dokument ili
razvojni AGENTS.md KnowledgeSource-a.

Sledeći AppShellSource koristi svoj config i isti globalni CSS. Njegov plan
pokazuje zamenu src/App.tsx i src/main.tsx; primenjuje se njegov postojeći
obrazac odobrenja te dve putanje. Foundation se posle toga ne pokreće kao reset.
