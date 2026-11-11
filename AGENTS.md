# MarkoAgentKnowledgeSource — razvoj kataloga

Važi samo za razvoj OVOG repozitorijuma. Ne kopira se u blank projekat i
nije uputstvo agentu koji generiše aplikaciju.

## Namena

Katalog samodovoljnih React/Core obrazaca. Jedan skill
`.agents/skills/marko-knowledge-agent/SKILL.md` prenosi više imenovanih
Source paketa. Source nije poseban agent.

- Piši samo ovde; referentne projekte koristi read-only.
- Koristi stvarni javni Core API/CSS. Bez drugog UI frameworka.
- Bez produkcionih podataka, tajni, registry konfiguracija, auth imitacije
  ili samoinicijativnih promena zavisnosti.
- Zahtev za jedan obrazac ne ovlašćuje dodavanje drugih funkcionalnosti.
- Prioritet je lak, pouzdan prenos u blank projekat i čitljiv React/Core kod.
  Patterni prate AppShell organizaciju; ne uvoditi zaseban runtime/config engine.
  MockData i preview ostaju van prenosivog patterna; pattern ih ne uvozi.
  Koristi termin Buttons ili Btns za akcione kontrole.

## Jedan vlasnik pravila

| Dokument | Odgovornost |
| --- | --- |
| Ovaj AGENTS.md | Razvoj i održavanje kataloga |
| Jedan globalni SKILL.md | Prva primena i izmene configa, četiri pravila, izveštaj |
| Jedan *Pattern.md po Source-u | Konkretan payload, konfiguracija, ograničenja i provere |
| README.md | Kratak indeks/komande, bez dodatnih pravila |
| Jedan imenovani *Config fajl po Source-u | Korisničko uputstvo agentu za prvu primenu i izmene; može biti prirodni tekst |

Ne praviti paralelne pravilnike ili prompt/transcript fajlove. Planirane
celine ne predstavljati kao dostupne skillove. Globalno pravilo menja se samo u SKILL.md.
Authoring AGENTS.md nije runtime referenca generisanja.

## Source ugovor

Dostupan `src/patterns/<SourceName>/` mora imati:
- funkcionalan kod, jasno izdvojene konfiguracione tačke;
- jedan imenovani config kao jedini korisnički ulaz, bez paralelnog upitnika.
  Agent sme da čita jasne rečenice; korisnik ne mora pisati TS/JSX/booleane.
  Pattern definiše kako ih prevodi u dozvoljene konfiguracione tačke.
  Ne uvoditi izvedenu data definiciju ili runtime šemu radi tumačenja tog teksta;
- tačno jedan imenovan *Pattern.md bez imena/putanja referentnih aplikacija;
- source.manifest.json: revision, fajlovi/uloge/digesti i proverene zavisnosti;
- screenshotove stvarno pokrenutog desktop i mobilnog prikaza za UI obrasce.
  Nevizuelni ProjectFoundationSource umesto screenshotova ima testove merge-a,
  čišćenja, povratnih kopija i kompozicije. Ne praviti lažne vizuelne reference.

Fiksni kod/CSS se prenose deterministički, ne prepisuju se iz opisa.
Podržana konfiguracija i host integracija moraju biti eksplicitne.
Ne predstavljati nepostojeći slot/varijantu kao podržane. Katalog sadrži samo obrasce sa implementacijom. Kod implementiranih obrazaca oznaka `.planned` blokira prenos dok se ne ispuni Source ugovor.

Izmena izvornog koda traži novu revision/digeste i odgovarajuće provere;
vizuelna izmena traži i screenshotove. Checksum se ne ažurira da bi se
prikrilo odstupanje ciljnog projekta.

Podržane opcije moraju imati tip, stvarnu upotrebu u komponenti, dokumentaciju
i test. Config nije beležnica želja niti zaobilaznica fiksnog koda; nepoznatu
opciju prijaviti. Novu opciju uvoditi samo po eksplicitnom zahtevu za doradu
Source-a. Ne održavati dva nezavisna izvora config vrednosti. Pattern/AGENTS
nisu paralelni config. Kod mora stvarno da primeni tekst; hash nije dokaz da je
agent ispravno protumačio rečenice. Deklarisani projektni scaffold se prilagođava
traženom sadržaju, dok fiksni layout/CSS ostaju zaštićeni.

## Provera pre predaje

- Pročitaj relevantan pattern, kod i stvarni Core API.
- Sačuvaj postojeće korisničke izmene; bez resetovanja/commit/push-a.
- Pokreni source proveru, testove, lint i build.
- Testiraj čist target i odbijanje kolizije, izmenjenog fiksnog fajla,
  nepostojećeg Source-a i nedostajuće/starije zavisnosti. Novije instalirane
  verzije moraju biti prihvaćene bez downgrade-a, uz izveštaj i provere.
- Za uspešan transfer potreban je novi target test; za vizuelnu jednakost
  slike/interakcije u istom viewportu, verziji Core-a, fontovima i okruženju.
- Razlikuj hash proveru, build, browser i izolovani transfer bez referenci.
  Build nije vizuelni dokaz. Bez neproverenih „100%” garancija.
- Privremene povratne kopije i testovi idu u ignorisani .codex-tmp/.

## Reference samo za autora

- Core API: C:/Users/marko.veljkovic/ComingUICORe/Coming.UI.Core/libs/themed-components
- E-Arhiva, samo development grana: C:/Users/marko.veljkovic/E-Arhiva-UI/E-Arhiva_UI
- OM.UI: C:/Users/marko.veljkovic/source/repos/OM.UI/OM.UI
- PSBG Mock: C:/Users/marko.veljkovic/PSBGMock

Ne menjaj reference i ne kopiraj velike delove njihovog koda. Ako referenca
ili grana nije dostupna, prijavi to. One nisu zavisnost generisane aplikacije.
Read-only i izolaciju testa moraju sprovoditi stvarne dozvole, ne samo prompt.
