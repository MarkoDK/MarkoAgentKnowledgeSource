# RolesAndPrivilegesConfig

Uputstvo agentu. Piši običnim rečenicama; nema posebne sintakse ni runtime parsera.

## Stranica

Naslov: Podešavanje rola i privilegija.
Brza pretraga po nazivu role i napredni filter po roli su uključeni.
Tabela: Rola, Korisnici, Podrazumevane, Ukupno privilegija, akcija desno.
15 redova po strani; sortiranje po kolonama. Mobilni prikaz su kartice.

## Edit ili Pregled

Rola sa ID-jem admin: samo Pregled.
Ostale role: Edit kada host aplikacija dozvoljava uređivanje.
Host bez prava izmene: samo Pregled za sve role.
Za druge readonly role navedi njihove stabilne ID-jeve ili jasna imena;
agent mora povezati ime sa stvarnim ID-jem. Ako nije jasno, pita tokom rada.

## Editor privilegija

Pretraga po nazivu, kodu ili ID-ju i izbor grupe/modula.
Podrazumevane privilegije su zaključane; dodatne se uređuju.
Preduslovi se dodaju uz odabranu akciju i ne mogu se skinuti dok su potrebni.
Pretraga i filter ne brišu selekciju ni prava koja trenutno nisu vidljiva.
Save menja ceo skup dodataka. Reset uz potvrdu briše samo dodatke.
Odustajanje sa nesnimljenim izmenama traži potvrdu.

## Podaci i API

Role, katalog privilegija, dodele i pravo izmene daje host aplikacija.
Default su prazni podaci, bez API-ja i bez poslovnih enum-a.
Učitavanje i čuvanje poveži samo sa API-jem koji navedem.
Bez save callbacka nema uspešnog čuvanja; Save/reset su disabled sa razlogom.
Ne dodeljuj prava iz naziva role i ne kopiraj katalog druge aplikacije.
