## Projektna uputstva — ProjectFoundationSource

- Pre rada pročitaj ovaj AGENTS.md, DesignRules.md i relevantne odluke iz
  DecisionLog.md. Aktuelna eksplicitna odluka vlasnika ima prednost nad starijom;
  stvaran konflikt ili nedefinisanu poslovnu posledicu prijavi, ne izmišljaj pravilo.
- Koristi javni API instaliranog `@coming.ui.core/themed-components` pre ručnog
  UI-ja. Ne izmišljaj Core propove/varijante i ne menjaj node_modules.
- Bez promene paketa, lockfile-a, konfiguracije alata ili dodavanja frameworka
  bez odobrenja. Noviju već instaliranu verziju zadrži i proveri kompatibilnost.
- Sačuvaj postojeći kod i korisničke izmene. Ne resetuj, ne briši nepoznate fajlove
  i ne pokreći commit/push bez zahteva. Destruktivne akcije imaju precizan cilj.
- Ne menjaj poslovna pravila radi izgleda. Ne dodaj auth, prava, API, produkcione
  podatke ili obavezna polja samo zato što ih primer negde ima.
- Fiksne fajlove Generated Sources ne prepisuj ručno. Pročitaj njihov ugovor;
  koristi deklarisani config. Odstupanje zahteva odobrenje i jasan zapis.
- Posle relevantnih izmena pokreni projektne testove, lint i build. Odvojeno
  navedi statičke provere, browser test i vizuelnu potvrdu; build nije dokaz izgleda.
- U DecisionLog.md upisuj potvrđene nove odluke: datum, odluku, razlog, obim i
  status primene. Ne pretvaraj svaku sitnu izmenu ili pretpostavku u poslovno pravilo.
- Tajne, tokene i privatne registry podatke nikada ne zapisuj u repozitorijum.
  Privremeni testovi i povratne kopije idu u ignorisani `.codex-tmp/`.

Ova sekcija dopunjuje postojeća projektna pravila, ne poništava ih.
