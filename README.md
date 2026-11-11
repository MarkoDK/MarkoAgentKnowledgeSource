# MarkoAgentKnowledgeSource

## APM instalacija

Paket 0.1.1 isporučuje ProjectFoundationSource i AppShellSource.
Pre prenosa prijavljuje sve nedostajuće biblioteke sa komandama za instalaciju.
Za Coming Core podseća na privatni npm registry i lokalni .npmrc ili korisničku konfiguraciju.
Za pripremu i proveru iz root-a ovog repozitorijuma:

~~~sh
npm run apm:package
npm run apm:check
~~~

Izvorni skill ostaje u .agents/skills/marko-knowledge-agent, patterni u src/patterns.
.apm/skills/marko-knowledge-agent je generisani distribucioni paket i ide u Git
zajedno sa apm.yml. Ažurira se isključivo komandom apm:package. Prenosi samo
skill, dve izvršne skripte i fajlove potrebne manifestima, uključujući slike.
Posle svake izmene isporučenih izvora ponovo pripremi paket i pokreni provere.
.gitattributes čuva tačne bajtove payload-a i manifesta pri Git kloniranju.

U terminalu ciljnog React/Vite projekta lokalna probna instalacija je:

~~~powershell
apm install "PUTANJA_DO_KNOWLEDGESOURCE" --target codex
~~~

Za instalaciju sa Git-a isti argument postaje HTTPS URL našeg repozitorijuma,
uz provereni tag/commit. URL i prijava se definišu kada repozitorijum postoji.
Instalacija pravi lokalni skill i apm.lock.yaml; APM se prethodno instalira na računaru.
Na Windows-u koristi kratku putanju projekta ako APM prijavi WinError 206.

Zatim u Codex chatu ciljnog projekta:

~~~text
$marko-knowledge-agent Primeni ProjectFoundationSource.
$marko-knowledge-agent Primeni AppShellSource koristeći njegov izvorni AppLayoutConfig.tsx, bez izmena.
~~~

Agent čita katalog unutar instaliranog skilla i koristi njegov source-transfer.
Core/React/Router/TypeScript moraju već biti instalirani u ciljnom projektu.
APM instalira znanje i izvorne fajlove za prenos; UI se dodaje pozivom patterna.
Cards, Dashboard, Role i Tabela ostaju u razvoju kataloga i nisu u ovoj APM verziji.

## Razvoj kataloga

Katalog prenosivih React obrazaca sa stvarnim Coming UI Core komponentama.

- [AGENTS.md](AGENTS.md): pravila razvoja kataloga.
- [SKILL.md](.agents/skills/marko-knowledge-agent/SKILL.md): jedini globalni ugovor generisanja.
- [AppShellSource](src/patterns/AppShellSource/AppLayoutPattern.md): konkretan ugovor dostupnog obrasca.
- [AppLayoutConfig.tsx](src/patterns/AppShellSource/config/AppLayoutConfig.tsx): primer jedinog korisničkog ulaza za AppShell.
- [ProjectFoundationSource](src/patterns/ProjectFoundationSource/ProjectFoundationPattern.md): projektna pravila i bezbedno uklanjanje prepoznatog Vite demoa.
- [TableAndAdvancedSearchSource](src/patterns/TableAndAdvancedSearchSource/TableAndAdvancedSearchPattern.md): jedan TSX + CSS, Core pretrage i tabela; opcione akcije samo po configu.
- [CardsAndAdvancedSearchSource](src/patterns/CardsAndAdvancedSearchSource/CardsAndAdvancedSearchPattern.md): kod je implementiran; čeka stvarne vizuelne reference i završni transfer test pre otključavanja generisanja.
- [RolesAndPrivilegesSource](src/patterns/RolesAndPrivilegesSource/RolesAndPrivilegesPattern.md): pregled i searchable editor, Edit/Pregled po configu; vizuelna potvrda pending.
- [DashboardSource](src/patterns/DashboardSource/DashboardPattern.md): šest kartica i dva reda tabela/grafikona; kod implementiran, vizuelne reference i završna transfer provera pending.

Početak projekta (AGENTS.md, DesignRules.md, DecisionLog.md i Vite cleanup):

~~~text
$marko-knowledge-agent Primeni ProjectFoundationSource.
~~~

Foundation ne dodaje AppShell ni poslovne ekrane. Postojeći custom sadržaj
čuva; prepoznati demo menja uz lokalne povratne kopije. Detalji i jedini
opcioni ulaz za naslov su u njegovom Pattern.md.

Jedan workflow: izaberi izvorni default ili priloži imenovani config sa svojim
uputstvima. Agent razume i jasan prirodni tekst; korisnik ne mora da piše TS/JSX.
Pattern određuje podržane mogućnosti i izvedenu implementaciju. Skill proverava postoji li Source: prvi put prenosi ceo
pattern, a kasnije menja samo izabranu konfiguraciju, bez resetovanja aplikacije.

Izvorni default (šest neutralnih ruta, prazne stranice, bez mock profila):

~~~text
$marko-knowledge-agent Primeni AppShellSource koristeći njegov izvorni AppLayoutConfig.tsx, bez izmena.
~~~

Skill iz engleskog path-a pravi projektni TSX, npr. `/cars` →
`src/features/cars/PreviewCars.tsx`; title određuje samo vidljivi Core header.
Import/element dopunjava agent, bez prepisivanja postojećih stranica.

Custom config, i za prvu primenu i za kasnije izmene:

~~~text
$marko-knowledge-agent Primeni AppShellSource koristeći priloženi AppLayoutConfig.tsx.
~~~

Skill mora biti dostupan u targetu, katalog read-only dostupan,
a Core i ostale zavisnosti instalirane u proverenim ili novijim verzijama.
Novije verzije se zadržavaju; alat ne instalira niti vraća starije pakete.
U target ide produkcijska struktura `src/layout` i `src/features`, ne `patterns`.

Preview: `npm run dev`. Primer profilnih podataka je u `src/MockData.ts`,
van prenosivog AppShell-a. Produkcioni bootstrap je unutar AppShellSource/app/.
Demo novog pregleda: `/table-search.html`, custom modal/akcije: `/table-search.html?demo=custom`.
Ljudski ulaz: [TableAndAdvancedSearchConfig.md](src/patterns/TableAndAdvancedSearchSource/config/TableAndAdvancedSearchConfig.md).

~~~text
$marko-knowledge-agent Primeni TableAndAdvancedSearchSource sa izvornim defaultom.
$marko-knowledge-agent Primeni TableAndAdvancedSearchSource koristeći priloženi TableAndAdvancedSearchConfig.md.
~~~

Provere: `npm run lint`, `npm run build`, `npm run test:contracts`.
Status i ograničenja obrasca su samo u njegovom Pattern.md.

Kartični preview: `/cards-search.html`; `?demo=custom` za header Btn i modal,
`?demo=empty`, `?demo=loading`, `?demo=error` za zasebna stanja.
Ulaz: [CardsAndAdvancedSearchConfig.md](src/patterns/CardsAndAdvancedSearchSource/config/CardsAndAdvancedSearchConfig.md).
Oznaka .planned blokira prenos dok ne postoje stvarni screenshotovi i potvrđen transfer.

Dashboard preview: /dashboard.html; ?demo=empty, ?demo=loading, ?demo=error, ?demo=no-status.
Ulaz: [DashboardConfig.md](src/patterns/DashboardSource/config/DashboardConfig.md).

~~~text
$marko-knowledge-agent Primeni DashboardSource sa izvornim defaultom.
$marko-knowledge-agent Primeni DashboardSource koristeći priloženi DashboardConfig.md.
~~~

Role/privilegije: [RolesAndPrivilegesSource](src/patterns/RolesAndPrivilegesSource/RolesAndPrivilegesPattern.md).
Preview: /roles.html; ?demo=readonly, ?demo=empty, ?demo=loading, ?demo=error,
?demo=load-error, ?demo=save-error, ?demo=missing-save.
Ulaz: [RolesAndPrivilegesConfig.md](src/patterns/RolesAndPrivilegesSource/config/RolesAndPrivilegesConfig.md).
Implementacija je proverljiva; vizuelna potvrda i završni transfer ostaju pending.

~~~text
$marko-knowledge-agent Primeni RolesAndPrivilegesSource koristeći priloženi RolesAndPrivilegesConfig.md.
~~~
