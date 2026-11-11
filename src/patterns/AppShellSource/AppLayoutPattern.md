# AppLayoutPattern — AppShellSource

Revision: **2.1.0**. Običan React/Core layout, router i prazne stranice.
Bez poslovnih API-ja, KC-a, privilegija, mock korisnika ili lažne odjave.

## Poziv

```text
$marko-knowledge-agent Primeni AppShellSource koristeći njegov izvorni AppLayoutConfig.tsx, bez izmena.
$marko-knowledge-agent Primeni AppShellSource koristeći priloženi AppLayoutConfig.tsx.
```

[AppLayoutConfig.tsx](config/AppLayoutConfig.tsx) je jedini config. Korisnik može
poslati taj fajl ili jasne rečenice; agent ih prevodi u njegov postojeći oblik.
Nema dodatnog opisnog fajla, izvedene definicije ili konfiguracionog engine-a.

## Šta se prenosi

[source.manifest.json](source.manifest.json) navodi izvor → odredište i otiske.
Svi izvori su unutar ovog patterna; preview i `src/MockData.ts` nisu payload.

| Izvor unutar patterna | Odredište u novom projektu |
| --- | --- |
| app/App.tsx, app/main.tsx, app/index.css | src/App.tsx, src/main.tsx, src/index.css |
| app/layout/AppShell.tsx, AppShell.module.css, navigation.ts | src/layout/ — isti nazivi |
| app/router/AppRoutes.tsx | src/layout/AppRoutes.tsx |
| config/AppLayoutConfig.tsx | src/layout/AppLayoutConfig.tsx |
| shared/AppIcon.tsx | src/layout/AppIcon.tsx |
| app/layout/EmptyPage.tsx i CSS module | src/layout/ — isti nazivi |

Alat kopira fajlove i usklađuje relativne importe. `patterns`, ovaj dokument,
manifest, screenshotovi i mock podaci ne ulaze u aplikaciju.
Ne prepisuj JSX/CSS iz opisa. Ne menjaj pakete ili postojeći bootstrap bez odobrenja.

## Config: gde se šta menja

Menja se samo inicijalizator `appLayoutConfig` i dodaju lokalni importi komponenti.
Tipovi i ostatak fajla ostaju isti.

| Polje | Namena |
| --- | --- |
| appName, shortName, menuLabel | Naziv aplikacije, oznaka logotipa i naziv menija |
| homePath | Postojeća konkretna ruta; logo i koren aplikacije vode ovde |
| topbar.showTitle | Prikaz naziva u gornjem baru |
| topbar.description | Opcioni opis; prazan tekst ga uklanja |
| topbar.actions | JSX za dodatne gornje kontrole ili null |
| topbar.profileMenu | Stvarna profilna komponenta ili null; default nema profil |
| pages | Jedini array za rute, naslove, sadržaj i navigaciju |

Svaka stavka `pages` ima:

| Polje | Ponašanje |
| --- | --- |
| path | Jedinstven engleski URL; određuje foldere i ime stranice |
| title | Vidljivi naslov; može biti na srpskom, ne određuje ime fajla |
| icon | Opciona ikonica stavke iz AppIconName |
| menuLabel | Opcioni naziv menija kada se razlikuje od naslova |
| menu | Default true; false skriva samo link, ne zabranjuje pristup |
| group | Opciona { label, icon? }; isti label grupiše stavke, bez icon koristi folder |
| createPage | Default true: skill pravi placeholder ako nema element; false bez element isključuje rutu/link |
| element | JSX stvarne stranice; zamenjuje prazan prikaz, bez dodatnog omotača |

Default ima šest neutralnih ruta. Skill za njih pravi šest malih projektnih TSX
stranica, ne nove helpere ili CSS fajlove. Redosled array-a određuje meni;
grupa je na mestu svog prvog člana, a njeni članovi prate redosled array-a.

### Stranice iz path-a — zadatak agenta

Ovo su instrukcije skillu, ne novi generator. Posle primene izabranog configa,
pre verify/lint/build, obradi sve uključene rute koje još nemaju element:

1. `path` je apsolutan engleski URL sa malim kebab-case segmentima (`/cars`,
   `/work-orders`). Ako je dat samo `cars`, dopuni vodeći `/`. `title` i menu/group
   labele mogu biti na srpskom. Ne prevodi neengleski URL prećutno: traži korekciju.
2. Statički segmenti određuju podfoldere unutar `src/features/`; title nikad ne
   koristi za putanju. Nazivi foldera su lowercase/kebab-case, komponente PascalCase.
   Bez dodatnog `pages` foldera. Ne dozvoli `..`, query/hash, eksterni URL ili wildcard
   da postanu folderi. Parametri ne postaju folderi.
3. Obična ruta dobija `Preview` + PascalCase poslednjeg statičkog segmenta.
   Završni `:param` dobija `Details`; završni `create` ili `edit` dobija `Create`
   ili `Edit` i ne ulazi u feature putanju. Prefiks nije prevod naslova.

| path | Projektni TSX |
| --- | --- |
| /cars | src/features/cars/PreviewCars.tsx |
| /settings | src/features/settings/PreviewSettings.tsx |
| /work-orders | src/features/work-orders/PreviewWorkOrders.tsx |
| /fleet/cars | src/features/fleet/cars/PreviewCars.tsx |
| /cars/:id | src/features/cars/DetailsCars.tsx |
| /cars/create | src/features/cars/CreateCars.tsx |
| /cars/:id/edit | src/features/cars/EditCars.tsx |

Ovo su primeri primene pravila, ne hardkodovan spisak podržanih modula.
Za svaki drugi važeći path iz configa izračunaj folder i naziv na isti način.
Na primer title „Podešavanja” ne menja engleski folder `settings`.

4. Pre upisa proveri sve predviđene putanje i duple rute/kolizije. Ne menjaj
   naziv nasumičnim sufiksom. Ako dve rute daju isti fajl, razjasni mapiranje.
5. Ako TSX ne postoji, napravi ga prema [EmptyPage.tsx](app/layout/EmptyPage.tsx):
   isti Core imports/JSX i zajednički `src/layout/EmptyPage.module.css`, ali konkretan
   naziv komponente, default export bez props-a i title iz configa kao bezbedan
   string literal u headeru. Uskladi relativni CSS import. Ne pravi zaseban CSS,
   podatke, API, Buttons, tabele ili dodatne head-up poruke za placeholder.
6. Dodaj lokalni import i `element: <PreviewCars />` u aktivni config. Za rute sa
   parametrima bez eksplicitnog izbora menija postavi `menu: false`; URL sa `:id`
   nije funkcionalan menu link. Fiksni AppShell/router ostaju nepromenjeni.

Primer ulaza `{ path: '/cars', title: 'Pregled svih vozila', icon: 'car' }`
daje `src/features/cars/PreviewCars.tsx` sa Core headerom „Pregled svih vozila”.
Agent sam dodaje import i element; korisnik ih ne piše. `Preview` znači poslovni
pregled, ne mock/demo podatke.

Ako element već postoji, ne pravi placeholder. Ako predviđeni fajl već postoji,
pregledaj njegove exporte i poveži postojeću komponentu, bez prepisivanja sadržaja;
ako to nije bezbedno/jasno, prijavi koliziju. `createPage: false` bez element-a
ne pravi fajl. Pri ponovnom pozivu ne resetuj razvijene stranice, ne briši stare
fajlove i ne preimenuj foldere zbog promene title-a.

Nove feature stranice pripadaju projektu i slobodno se dalje razvijaju; nisu
fiksni payload niti se njihovi otisci dodaju source manifestu. `EmptyPage` je mali
fallback za preview/privremeno nepovezanu rutu, ne poslovni feature. Posle skilla
sve uključene rute moraju imati stvarni element; sama CLI apply komanda ne pravi
ove stranice i njen uspeh nije potvrda završenog skill workflow-a.

### Povezivanje stvarne stranice

U `src/layout/AppLayoutConfig.tsx` dodaj import postojeće komponente:

```tsx
import CarsPage from '../features/cars/CarsPage'
```

Zatim dodaj ili promeni stavku u `pages`:

```tsx
{ path: '/cars', title: 'Automobili', icon: 'car', element: <CarsPage /> },
```

Router ostaje nepromenjen. Stranica dobija sopstveni sadržaj bez duplog section-a.
Ako komponenta ne postoji, najpre je implementiraj u okviru odobrenog zadatka;
ne ostavljaj nepostojeći import ili lažno povezanu funkcionalnost.
Detaljne rute mogu koristiti parametre (npr. `/cars/:id`) i `menu: false`.
`homePath` mora biti konkretna uključena ruta, ne `/`, parametar ili wildcard.
Putanje su interne i jedinstvene; ne koristiti korenu `/` ili `*` kao poslovnu stavku.
Isti group label mora imati istu ikonicu. To proveri pri tumačenju configa.

### Profil i druge topbar kontrole

Na isti način uvezi stvarnu aplikacijsku komponentu i postavi
`topbar.profileMenu: <UserProfile />` ili `topbar.actions: <HeaderActions />`.
Podatke korisnika, API i odjavu rešava ta komponenta — ne AppShell.
Bez integracije ostavi null; ne kopiraj preview profil ili mock identitet.

AppShell/AppRoutes zadržavaju i opcione JSX props `topbarTitle`,
`topbarActions`, `profileMenu` (preko `shellProps` kod AppRoutes).
undefined koristi config, null uklanja slot, JSX ga zamenjuje. To je postojeći
programski API; za normalno podešavanje koristi config, ne menjaj bootstrap.

Config prihvata podatke, reference i JSX slotove, ne inline funkcije/pozive,
CSS overrides ili novu poslovnu logiku. Potrebne callbacks smesti u stvarnu
stranicu/profilnu komponentu. Dodatni importi su lokalne aplikacijske komponente;
ne menjaj izvorne importe i ne dodaj side-effect importe ili pakete.

## Prenos i provera

Globalni workflow je u učitanom `marko-knowledge-agent/SKILL.md`.
`<catalog>` i `<target>` zameni stvarnim putanjama; target je zaseban blank React/TS projekat.

```text
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs check-source --source AppShellSource
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs plan --source AppShellSource --target <target>
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs apply --source AppShellSource --target <target>
```

Plan ne piše. Koliziju rešavaj samo odobrenjem za tačan `--replace-file`,
ne resetovanjem projekta. Apply prenosi default; zatim primeni izabrani config
i napravi/poveži stranice prema odeljku „Stranice iz path-a”.

```text
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs verify --source AppShellSource --target <target>
npm run lint
npm run build
```

Lint/build pokreni u targetu. Verify proverava fiksne fajlove i granice configa,
ne izvršava config i ne dokazuje poslovnu ispravnost niti vizuelnu jednakost.
Izmene drugih stranica dozvoljene su u njihovim fajlovima, ne u fiksnom routeru.

Ponovni poziv menja aktivni config i dopunjuje nedostajuće stranice, bez resetovanja.
Prethodne revisions imaju drugačiji payload/config: potrebna je pregledana migracija,
uz očuvanje postojećih ruta, stranica i integracija, ne automatski overwrite.

## Prihvat i granice

- Čist target: source/verify, lint, TypeScript i build prolaze; nema imports ka katalogu.
- Druga aplikacija: izmenjeni naziv, rute, grupe, home, stvarni element i topbar slotovi rade.
- Posle skilla sve uključene rute imaju postojeći TSX i element; proveri tačne
  foldere, naziv komponente i Core header, bez srpskih naziva foldera ili workspace feature-a.
- Default: samo prazne Core stranice; nema mock podataka, profilnog menija ili API-ja.
- Root/logo vode na home; nepoznata i isključena ruta daju Core 404.
- Detalj zadržava aktivnu najbližu roditeljsku menu rutu.
- Svaka uključena ruta postavlja naslov dokumenta; stvarna stranica nema placeholder omotač.
- Navigacija resetuje lokalno stanje topbar kontrola, ne remountuje celu stranicu.
- Core poseduje drawer, focus, Escape, overlay i body lock; ne kopirati tu logiku.
- Core CSS se uvozi pre index.css. Font/boje/razmaci nisu slobodna config opcija.
- Topbar naslov se skriva do 760 px; profil/akcije ostaju dostupni.
- Proverene verzije su u manifestu. Novije zadrži i testiraj, bez downgrade-a.

Browser proveru radi korisnik: 1440×900, 768×1024 i 390×844;
meni/grupe/logo, Back, refresh, direktna ruta, 404, profil i Escape.
[screenshot desktop](screenshots/app-shell-desktop.png) i
[screenshot mobile](screenshots/app-shell-mobile.png) su ranije reference,
ne potvrda revision 2.1.0. Novi browser/screenshot test nije izvršen.
Automatski testovi proveravaju prenos i stvarni Core server render; ne obećavaju 100% pixel-perfect rezultat.
