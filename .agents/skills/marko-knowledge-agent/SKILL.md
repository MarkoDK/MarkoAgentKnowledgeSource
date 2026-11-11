---
name: marko-knowledge-agent
description: Apply a named MarkoAgentKnowledgeSource pattern, establish ProjectFoundation rules with safe Vite demo cleanup, or interpret a natural-language config and update supported configuration in a target React/Core project. Not for authoring the knowledge catalog.
---

# Coming knowledge agent — globalni ugovor

Jedan skill prenosi više Source paketa. Piši samo u ciljni projekat.
KnowledgeSource koristi read-only. Ovaj fajl je jedini globalni ugovor
generisanja; konkretne detalje čitaj iz jednog *Pattern.md izabranog Source-a.
Authoring AGENTS.md KnowledgeSource-a nije zavisnost ovog postupka.

## Četiri obavezna pravila

1. **Source/izvorni kod se prenosi, ne izmišlja.** Fiksne fajlove kopiraj bez
   prepisivanja JSX-a, promene CSS-a, formatiranja ili zamene Core komponenti.
   Alat jedini prilagođava relativne import putanje prema manifestovom
   `from` → `to` mapiranju; katalog `patterns` ne ulazi u ciljni projekat.
   Screenshot je referenca provere, ne povod za novu implementaciju.
2. **Menja se samo deklarisana konfiguracija.** Dostavljeni `<PatternName>Config`
   je uputstvo agentu i sme biti običan tekst. Nije dozvola za redizajn.
   Pattern imenuje podržane opcije, host adapter i limit.
3. **Koristi se provereni alat prenosa.** Plan → pregled kolizija → primena →
   konfiguracija → verify. Ne zaobilazi grešku ručnim prepisivanjem.
4. **Rezultat se dokazuje.** Hash/config/dependency provere, lint/build i
   interaktivni/vizuelni testovi su odvojeni. Nema uspeha uz obavezan pad
   niti pixel-perfect tvrdnje samo na osnovu build-a.

## Preflight — bez upisa

Za `ProjectFoundationSource` prvo pročitaj njegov `ProjectFoundationPattern.md`.
To je nevizuelni obrazac: tri projektna dokumenta + prepoznati starter cleanup.
Sam poziv „Primeni ProjectFoundationSource” bira njegov dokumentovani default;
opciono koristi priloženi ProjectFoundationConfig.json. Za njega važi posebni
merge/cleanup ugovor ispod, ne AppShell pravilo o fiksnom runtime bootstrap-u.

- Pročitaj ciljni AGENTS.md, postojeći DesignRules.md i izabrani `<PatternName>Config`.
  Ulaz je priloženi custom config ili izvorni primer kada korisnik izričito bira
  default. Isti je workflow: agent čita i rečenice i strukturisane vrednosti.
  Ne traži od korisnika TypeScript/JSX/booleane samo zato što renderer koristi tipove.
  Sačuvaj postojeća uputstva; ne pravi dodatni opisni upitnik za iste vrednosti.
- Utvrdi target root, Source, postojeće fajlove i eksplicitne izuzetke.
- Jedan poziv „Primeni Source koristeći config” pokriva prvu primenu i
  ažuriranje. Pregledaj Generated Sources i stvarne fajlove: za novu primenu
  planiraj prenos; za postojeći Source prvo proveri integritet i primeni samo
  izabrane konfiguracione vrednosti. Kolizija, nepotpun prenos ili nepodudarna
  revision nisu dozvola za reset; prijavi stanje i traži odobrenje za migraciju.
- U APM instalaciji katalog je u assets/catalog/ unutar ovog skill foldera;
  odatle čitaj src/patterns/<SourceName>/<PatternName>Pattern.md i njegove fajlove.
  Skripta sama nalazi ovaj katalog, bez putanje ka autorovom računaru.
  U razvojnom checkout-u koristi src/patterns/ u root-u KnowledgeSource-a.
  Ako izabrani Source nije u instaliranom paketu, prijavi da nije isporučen.
- Čitaj samo izabrani pattern, njegov manifest/kod/slike i alat ispod.
  Ne otvaraj originalne referentne aplikacije.
- Source je dostupan samo sa stvarnim patternom, payloadom, manifestom i
  navedenim referencama; pomen u razgovoru nije dostupna implementacija.
- Pokreni source proveru; za prvu primenu target plan, za postojeću proveru
  integriteta pre izmene. Pali verify nije razlog za automatski apply/reset.
- Koristi stvarne instalirane pakete ciljnog projekta. Novija verzija od
  proverene u manifestu NE blokira prenos; zadrži je i proveri lint/build
  i ponašanje. Manifest nije pin niti razlog za downgrade. Nedostajući ili
  stariji paket prijavi kroz zajednički preflight: navedi sve pogođene biblioteke,
  njihove minimalne verzije i predložene terminal komande. Za npm koristi
  --save-exact da package.json zadrži konkretnu verziju. Ako nedostaje Coming
  Core, pre njegove komande podseti na lokalni .npmrc ili korisničku registry
  konfiguraciju. Postojeći ispravan paket zadrži. Instalaciju izvrši tek po
  izričitom zahtevu ili odobrenju korisnika, pa ponovi preflight.
  Stvarna nekompatibilnost se prijavljuje konkretno, ne maskira lažnim Core-om.
- Ne čitaj .npmrc/credentials. Ne izmišljaj auth, prava, API ili podatke.
- Osim dokumentovanog Foundation defaulta, ako nema custom configa ni eksplicitnog izbora izvornog defaulta, pitaj
  koji config korisnik želi. Ne pretvaraj demo podatke u neizgovoreni izbor.

## Prenos

Alat: [scripts/source-transfer.mjs](scripts/source-transfer.mjs).
Pattern određuje tačne komande i mapiranje. Alat kopira fiksne fajlove;
agent tumači izabrani config i menja deklarisane konfiguracione tačke.
Prirodni jezik ne izvršava se kao program i ne daje ovlašćenje van traženog patterna.
Za TableAndAdvancedSearchSource pročitaj njegov TableAndAdvancedSearchPattern.md:
jedan ljudski TableAndAdvancedSearchConfig.md primenjuje se direktno na označene
delove običnog TSX scaffold-a. Bez generisane definicije, action registry-ja ili
runtime engine-a. Default ima samo toolbar, panel i tabelu; poslovne Buttons,
row actions i modale dodaj kao konkretan JSX samo kada ih config traži.
CSS ostaje fixed. Scaffold promene pregledaj prema configu i proveri lint/build;
source digest ne tvrdi da je prilagođena stranica identična početnom TSX-u.
Za CardsAndAdvancedSearchSource isti postupak koristi njegov
CardsAndAdvancedSearchPattern.md i CardsAndAdvancedSearchConfig.md: jedan TSX
scaffold + fixed CSS, bez runtime config engine-a. CoreExpandableCards poseduje
kartice, expand i skrol; podaci/filteri i page state su u stranici. Paginaciju
prikazuje javni CorePagination u pagination slotu kartica; ne kopiraj pager.
Status, prečica, novi sadržaj i poslovne akcije dodaju se samo po configu.
Za DashboardSource pročitaj DashboardPattern.md i DashboardConfig.md: konkretan
DashboardPage.tsx scaffold, fixed mali UI/chart fajlovi i CSS. U oba reda su
dozvoljeni samo tabela, linijski grafikon i pizza chart. Tumači nameru configa;
za bitnu nedoumicu pitaj tokom rada. Promena prikaza čuva podatke i naslov
slota. Nema runtime parsera niti proizvoljnih novih widgeta.
Za RolesAndPrivilegesSource pročitaj RolesAndPrivilegesPattern.md i RolesAndPrivilegesConfig.md:
CoreTable pregled i pretraživi Core editor, Edit/Pregled po stabilnom role ID-ju.
Host daje katalog, dodele i stvarne load/save callbacke. Podrazumevane privilegije
su zaključane; nema prenosa poslovnih enum-a niti izmišljanja API-ja.
Za ProjectFoundationSource isti alat automatski koristi njegovu managed-document
i starter granu: plan → pregled → apply → verify. Dokumenti se dopunjuju bez
brisanja postojećih pravila, neprepoznat kod se čuva, prepoznat demo menja uz
povratne kopije. Ne koristi --replace-file da zaobiđeš zaštitu Foundation-a.
U izveštaju navedi šta je očišćeno, šta je sačuvano i lokaciju kopija. Samo
dodavanje DesignRules.md ne implementira sve buduće komponente ili ponašanja.
Za AppShellSource jedini ulaz je AppLayoutConfig.tsx: jedan appLayoutConfig objekat,
pages array za rute/meni i JSX slotovi za stvarne stranice/topbar kontrole.
Default je neutralan kostur bez mock identiteta. Dozvoljeni su lokalni importi
komponenti i izmena objekta; ne menjaj tipove, fiksni router ili bootstrap.
Preview/MockData ostaju u katalogu. Granice i primer integracije su u AppLayoutPattern.md.
Za uključene AppShell rute bez element-a prati odeljak „Stranice iz path-a” u
AppLayoutPattern.md: path je engleski i određuje feature folder/naziv TSX-a,
title određuje samo vidljivi naslov. Napravi minimalni Core placeholder i poveži
import/element u configu. Postojeći fajl ne prepisuj. Ovo radi agent posle prenosa,
ne source-transfer komanda; bez novog generatora ili runtime engine-a.

- Različit postojeći fajl je kolizija, ne automatska dozvola za overwrite.
  Posle korisničkog odobrenja prosledi samo konkretne --replace-file putanje;
  nema blanket force. Isti fajl ne prepisuj.
- Menjaj samo inicijalizatore/host tačke ili scaffold delove dozvoljene manifestom i patternom.
  Bez novih margina, breakpoints, ručnog prepakivanja import-a ili node_modules izmena.
- Ne menjaj Source/manifest da bi target verify prošao. Ne formatiraj
  kopirane fiksne fajlove. Lepši alternativni JSX je i dalje odstupanje.
- Drugi Source dodaj samo ako je zatražen i dostupan. Kompozicija ne daje
  dozvolu za tihi redizajn prethodnog Source-a.
- Nepodržana varijanta/override ostaje pending ili blokirana sa razlogom.
  Ne proširuj samostalno obrazac i ne tvrdi da je nedostupan slot realizovan.

## Kasnije izmene — isti config, isti skill

Foundation izuzetak: ponovni plan/apply je idempotentan za source-owned blokove,
čuva postojeću odluku i korisnički kod. Ako je blok ručno izmenjen ili revision
drugačija, prijavi i traži pregledanu migraciju. Ne vraćaj kasniji AppShell na
prazan bootstrap. Primenjeni izvorni dokumenti i istorija imaju sopstvene markere.

- Isti skill koristi se za prvu primenu i kasnije izmene. Za postojeću
  implementaciju pročitaj Generated Sources i aktivni config; proveri fixed
  fajlove, pa promeni samo odobrene konfiguracione vrednosti i ponovi verify,
  lint/build i relevantne interakcije. Ne pokreći apply preko postojećeg
  prilagođenog configa da bi ga vratio na demo vrednosti.
- Ljudski config je jedini korisnički ulaz. Ne uvodi paralelnu izvedenu definiciju.
  Jasna rečenica je validan zahtev agentu, ali komentar sam ne implementira opciju:
  agent mora promeniti dozvoljene vrednosti i proveriti stvarno ponašanje.
- Nova konfiguraciona opcija mora imati tip, stvarnog potrošača u komponenti,
  podrazumevanu vrednost, dokumentaciju i test. Nepostojeći ključ ne ignorisati
  i ne primenjivati ručnim CSS/JSX izuzetkom. Prijavi nepodržanu opciju; tek
  eksplicitno odobrena dorada Source-a uvodi novu revision i ažurirane otiske.
- Svaki Source imenuje svoj config. Pomen budućeg naziva nije dostupna implementacija.

## Trajna projektna uputstva

Konfiguracione vrednosti čuvaj u configu. Kada korisnik izričito traži
pamćenje nekonfiguracionog projektnog pravila, nedestruktivno dopuni ciljni
AGENTS.md; nije potrebna posebna fraza niti skill. Ne dupliraj config vrednosti.
Sačuvaj nepovezana pravila i obavezna projektna/bezbednosna ograničenja.
Ako instrukcija i dostavljeni config protivreče jedno drugom, traži
razjašnjenje. Nepodržan zahtev prijavi, bez zaobilaženja fixed-file provere.

## Pravila za budući rad u targetu

Nedestruktivno održavaj jednu sekciju `## Generated Sources` u ciljnom AGENTS.md:
Source/revision, paket verzije, fiksne putanje, konfiguracione tačke, komanda
provere i odobrena odstupanja/pending integracije. Ne kopiraj authoring
AGENTS.md/lokalne reference i ne prepisuj korisnička pravila.
Ovo sprečava slučajnu izmenu šablona; korisnik i dalje može eksplicitno
zahtevati drugi obrazac/dizajn, koji ne sme lažno ostati označen kao baseline.
Foundation umesto runtime Generated Sources beleške koristi source-owned
sekcije u AGENTS/DesignRules i jedinstven adoption zapis u DecisionLog-u.
Ne dupliraj ih ručno; kasniji UI Source-i mogu dodati svoj Generated Sources blok.

## Završetak

1. Verify posle konfiguracije i svake popravke.
2. Ciljni lint/build i konkretni pattern testovi.
3. Uz odobren browser: interakcije i referentne širine. Zabeleži stvarne
   verzije iz dependency izveštaja alata; novija verzija nije dokaz greške
   niti dokaz vizuelne jednakosti sa starom. Bez browser-a vizuelna provera
   je NIJE TESTIRANO.
4. Izveštaj: PRIMENJENO (Source/revision/konfiguracija), ODSTUPANJA,
   PENDING/BLOKIRANO i rezultat svake provere. Upis fajlova nije test aplikacije.
5. Ne tvrdi završenim neproveren prenos ili modifikaciju koja nije implementirana.

Izolovani transfer test: read pristup samo potrebnom katalogu i paketima,
write samo na namenski target; originalne reference tehnički nedostupne.
Testirati i konfiguraciju druge aplikacije, ne samo preimenovati demo projekat.
