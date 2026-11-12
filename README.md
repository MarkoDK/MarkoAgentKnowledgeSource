# MarkoAgentKnowledgeSource

## APM instalacija

Paket 0.3.0 podržava ProjectFoundationSource i AppShellSource.
APM u ciljni .agents/skills/marko-knowledge-agent postavlja samo SKILL.md.
Izvorni kod, screenshotovi i skripte ostaju u ignorisanom apm_modules paketu;
ne dupliraju se kao assets/catalog i ne ulaze unapred u aplikacioni src.

U terminalu fresh Vite React/TypeScript projekta:

~~~powershell
apm install MarkoDK/MarkoAgentKnowledgeSource#main --target codex --refresh
~~~

Vidljive nove datoteke su apm.yml, apm.lock.yaml i ulazni SKILL.md,
uz izmenu postojećeg .gitignore. Vite fajlovi i kasniji transfer su odvojene
izmene. apm_modules se ne commit-uje. APM se prethodno instalira na računaru.

Zatim u Codex chatu istog projekta:

~~~text
$marko-knowledge-agent Primeni ProjectFoundationSource.
$marko-knowledge-agent Primeni AppShellSource koristeći njegov izvorni AppLayoutConfig.tsx, bez izmena.
~~~

Ulazni skill pronalazi instalirani paket, čita njegov jedini globalni ugovor
i pokreće originalni transfer alat iz tog paketa. Ne koristi autorov lokalni
checkout. Agent sam proverava integritet, pakete, kolizije i rezultat.
Preflight prijavljuje nedostajuće biblioteke i Core registry setup; instalacija
APM-a sama ne instalira npm zavisnosti i ne primenjuje nijedan pattern.
Cards, Dashboard, Role i Tabela ostaju van ovog APM obima.

Za autora, posle izmena ugovora ili isporučenih izvora:

~~~sh
npm run apm:package
npm run apm:check
~~~

.apm/skills/marko-knowledge-agent/SKILL.md je generisani kratki ulaz, bez
kopiranog kataloga i paralelnih pravila. Izvorni ugovor ostaje u .agents/skills,
a patterni u src/patterns. Provera pakovanja proverava oba podržana manifesta.
Git instalacija ne traži build paketa. Na Windows-u koristiti kratku putanju
projekta ako APM prijavi ograničenje putanje pri Git kloniranju.

## Razvoj kataloga

Katalog prenosivih React obrazaca sa stvarnim Coming UI Core komponentama.

- [AGENTS.md](AGENTS.md): pravila razvoja kataloga.
- [SKILL.md](.agents/skills/marko-knowledge-agent/SKILL.md): jedini globalni ugovor generisanja.
- [AppShellSource](src/patterns/AppShellSource/AppLayoutPattern.md): konkretan ugovor dostupnog obrasca.
- [AppLayoutConfig.tsx](src/patterns/AppShellSource/config/AppLayoutConfig.tsx): primer jedinog korisničkog ulaza za AppShell.
- [ProjectFoundationSource](src/patterns/ProjectFoundationSource/ProjectFoundationPattern.md): prvi pattern: projektna pravila i potpuno uklanjanje početnog Vite sadržaja.
- [TableAndAdvancedSearchSource](src/patterns/TableAndAdvancedSearchSource/TableAndAdvancedSearchPattern.md): jedan TSX + CSS, Core pretrage i tabela; opcione akcije samo po configu.
- [CardsAndAdvancedSearchSource](src/patterns/CardsAndAdvancedSearchSource/CardsAndAdvancedSearchPattern.md): kod je implementiran; čeka stvarne vizuelne reference i završni transfer test pre otključavanja generisanja.
- [RolesAndPrivilegesSource](src/patterns/RolesAndPrivilegesSource/RolesAndPrivilegesPattern.md): pregled i searchable editor, Edit/Pregled po configu; vizuelna potvrda pending.
- [DashboardSource](src/patterns/DashboardSource/DashboardPattern.md): šest kartica i dva reda tabela/grafikona; kod implementiran, vizuelne reference i završna transfer provera pending.

Početak projekta (AGENTS.md, DesignRules.md, DecisionLog.md i Vite cleanup):

~~~text
$marko-knowledge-agent Primeni ProjectFoundationSource.
~~~

Foundation se prvo poziva u blank projektu: čisti src/public i demo README,
postavlja prazan bootstrap i čuva lokalne povratne kopije. Ponovni poziv ne
resetuje kasnije dodat kod. Ne dodaje AppShell ni poslovne ekrane. Detalji i jedini
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
