# ProjectFoundationSource — 1.1.0

Nevizuelni obrazac početka projekta: zajednička pravila i bezbedno čišćenje
prepoznatog Vite React/TypeScript demo sadržaja. Nije AppShell, auth ili feature.
Jedan postojeći `marko-knowledge-agent` poziva postojeći source-transfer alat;
poseban agent i instalacija paketa nisu potrebni.

## Poziv i ulaz

~~~text
$marko-knowledge-agent Primeni ProjectFoundationSource.
~~~

Ovaj poziv eksplicitno bira dokumentovani default, uključujući neutralni
`documentTitle` iz [ProjectFoundationConfig.json](config/ProjectFoundationConfig.json).
Jedina custom opcija je taj naslov neutralnog HTML-a; nema slobodnih CSS opcija.

~~~text
$marko-knowledge-agent Primeni ProjectFoundationSource koristeći priloženi ProjectFoundationConfig.json.
~~~

Config je JSON objekat sa tačno jednim `documentTitle` stringom (1–100 znakova).
Alat ga parsira kao podatke, ne izvršava ga. Naslov HTML-escape-uje. Ostali
ključevi se odbijaju. Config je ulaz alatu, ne runtime React config. U postojećoj
aplikaciji se custom HTML ne prepisuje zbog naslova. Za navigaciju i naziv
AppShell-a koristi se njegov zaseban AppLayoutConfig, ne ovaj config.

## Sadržaj u targetu

| Fajl | Primena |
| --- | --- |
| AGENTS.md | Dodaje jednu označenu sekciju sa projektnim načinom rada |
| DesignRules.md | Dodaje verzionisani zajednički dizajn pravilnik |
| DecisionLog.md | Dodaje jednu odluku sa stvarnim datumom, revision i izvršenim akcijama |
| src/App.tsx | Prazan React root, samo ako je entry grupa prazna/prepoznati starter |
| src/main.tsx | Core CSS pa aplikacioni CSS, isti uslov kao App |
| src/index.css | Isti globalni font/fallback i reset kao AppShellSource |
| index.html | Neutralan naslov, bez Vite favicon-a, samo za prepoznati starter |
| .gitignore | Čuva postojeće stavke i dodaje završno `.codex-tmp/` pravilo |

U target ne ide `patterns` katalog, fixture-i, ovaj Pattern.md ili authoring
AGENTS.md kataloga. Tri projektna dokumenta su namerni deliverables ovog
obrasca, ne dodatna paralelna uputstva za generisanje.

### Font i dizajn — šta je stvarno implementirano

Proveren je instalirani Core **0.1.10**: njegov stylesheet nema `@font-face`
i font-family deklaracije su `inherit`. Ne obezbeđuje font aplikacije.
Bootstrap koristi isti Inter-first **fallback stack** kao AppShell, bez tvrdnje
da je Inter učitan i bez download-a. Ako korisnik traži identičnu tipografiju
na svim računarima, potrebni su odobreni font asseti i zasebna provera.

DesignRules.md je pravilnik za naredne implementacije: ne dodaje sam od sebe
modal wrapper, search hook, warning-soft dugme ili ekran. Dostupnost CoreNotice
i konkretnih API-ja proverava se u instaliranoj verziji; 0.1.10 ga eksportuje.
Postojeći stilovi i poslovne funkcije se ne menjaju prećutno usvajanjem pravilnika.

## Pravila bezbednog čišćenja

- Prepoznaje tačne tekstove zvaničnog `vitejs/vite` React-TS startera sa tagova
  **v7.3.0** i **v8.0.0**; samo CRLF/LF razlika se normalizuje za prepoznavanje.
  Tekst/hash fixture je pod MIT licencom Vite autora, sa izvorima u
  [fixtures/vite-react-ts.json](fixtures/vite-react-ts.json). Drugačija verzija
  nije automatski podržana: sačuva se i prijavi.
- App/main/index.css su jedna grupa. Ako ijedan sadrži korisnički kod, čuvaju
  se svi. Ne uklanjaj samo njegov CSS niti zameni root dok drugi deo ostaje custom.
- Ne briše fajlove samo po imenu. App.css, React/Vite SVG, hero i javne ikonice
  brišu se samo uz tačan poznat otisak i kada ih više ne referencira budući sadržaj.
  Preostali reference scan je konzervativan: lažno zadržavanje je bolje od gubitka.
  Proverava sve fajlove u src/public (ne samo JS/CSS ekstenzije) i index.html.
  Ne čita env/registry/credentials sadržaj niti zavisnosti/Git. Ako preskoči takav
  sadržaj ili fajl veći od 2 MiB, čuva sve kandidate za brisanje i prijavljuje razlog.
- Custom HTML, logotipi, CSS i nepoznate datoteke ostaju. Ne diraju se paketi,
  lockfile, tsconfig, Vite config, env, .npmrc ili Git istorija.
- Svaki zamenjeni/obrisani fajl prvo dobija bajt-identičnu povratnu kopiju u
  `.codex-tmp/project-foundation-backups/<unique-run>/`, uz receipt sa otiscima.
  Ne brišu se folderi rekurzivno. Povratna kopija je lokalna, ne commit-uje se.
- Plan ne piše ništa. Izmenjena/neispravna source-managed sekcija blokira
  ceo apply pre prvog upisa; ostatak korisničkih dokumenata se čuva. Kod promene
  pravilnika nova revision traži eksplicitno pregledanu migraciju, ne reset.
- Ponovni apply ne dodaje drugu odluku niti briše istoriju. Kasniji AppShell
  ili aplikacija sme da zameni početni prazan bootstrap; Foundation verify ne
  zaključava zauvek src/App.tsx i ne vraća projekat na prazan ekran.

## Izvršavanje i provera

Preduslovi: postojeći projekat sa package.json, lint/build skriptama i stvarno
instaliranim Core/react/react-dom u proverenim ili novijim verzijama iz manifesta.
Preflight odjednom prijavljuje sve nedostajuće ili prestare biblioteke, minimalne
verzije i komande npm install --save-exact. Za privatni Core podseća da je pre
instalacije potreban lokalni .npmrc ili korisnička registry konfiguracija.
Pravilo ne zahteva lokalni .npmrc ako registry već radi preko korisničke
konfiguracije. Provera ne čita credentials i ne izvršava instalacione komande.
Nema samostalnog install/update/downgrade-a. Ako Core nedostaje, zatraži odobrenje
za instalaciju i stani pre upisa. Noviju verziju zadrži i testiraj.

Iz kataloga (TARGET je zaseban projekat, nikada katalog ili njegov podfolder):

~~~sh
node .agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs check-source --source ProjectFoundationSource
node .agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs plan --source ProjectFoundationSource --target TARGET
node .agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs apply --source ProjectFoundationSource --target TARGET
node .agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs verify --source ProjectFoundationSource --target TARGET
~~~

Za custom JSON dodaj `--config ABSOLUTE_CONFIG_PATH` plan/apply/verify komandama.
Foundation nema `--replace-file` escape: custom kod se čuva, ne pregazi.
Agent posle plan-a pregleda sve akcije; ne zaobilazi prijavljenu prepreku.

Posle primene u targetu pokreni lint/build. U DecisionLog dopiši samo stvarno
izvršene rezultate; alat iskreno beleži da ih nije pokrenuo. Izveštaj razdvaja
uspešan dokumentacioni ugovor, očišćeni demo i sačuvani custom sadržaj. Sačuvani
nepoznati starter nije „potpuno očišćen”. Ako upis pukne, proveri receipt/stanje,
ne ponavljaj naslepo i ne vraćaj korisničke izmene automatski.

Foundation nema sopstveni UI, pa screenshots nisu primenljivi. Čist root je
namerno prazan dok se ne doda AppShell/stranica. Browser provera praznog ekrana
i fontova kada postoje komponente nije isto što i hash, test ili build.

### Kompozicija sa AppShellSource

Preporučen redosled je Foundation pa AppShell. Globalni CSS je isti izvorni
fajl, ali App/main se razlikuju. Prikaži AppShell plan: traži potvrdu zamene
tačno `src/App.tsx` i `src/main.tsx` ako postoje. Zatim prosledi te dve precizne
`--replace-file` putanje; nikada blanket force niti automatski reset zbog kompozicije.
AppShell-ov Generated Sources zapis i Foundation sekcije ostaju zajedno.
