## Zajednički dizajn pravilnik — verzija 1.1.0

Projektni standard za nove ekrane. Ovo su uputstva, ne automatski CSS patch:
postojeći ekran se ne redizajnira samim dodavanjem ovog dokumenta. Potvrđeni
projektni izuzeci ostaju važeći i evidentiraju se u DecisionLog.md.

### 1. Core i fontovi

- Core je primarni design system. Prvo proveri stvarno instaliranu verziju,
  njene tipove, tokene i postojeće obrasce. Ne uvodi drugi UI framework.
- Provereni Core 0.1.10 NE učitava font: nema `@font-face`, a komponente koriste
  `font-family: inherit`. Font aplikacije definiše se jednom, u globalnom CSS-u.
  Za drugu verziju proveri stvarni paket; ne zaključuj iz Storybook fonta.
- Osnovni stack ovog Source-a je
  `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
  To je fallback stack, NE dokaz da je Inter učitan. Bez lokalnog/odobrenog font
  asseta koristi se dostupan sistemski font. Ne preuzimaj font bez odobrenja.
- Za garantovano isti izgled potrebni su isti stvarno učitani font, težine,
  Core verzija i viewport. Ne obećavaj pixel-perfect samo na osnovu CSS naziva.
- Form kontrole nasleđuju font (`font: inherit`); ne propisuj različite fontove
  po komponentama. Zadrži Core veličine/težine, osim potvrđenog projektnog izuzetka.
- U entry fajlu prvo uvezi `@coming.ui.core/themed-components/style.css`, pa
  aplikacioni globalni CSS. Ne kopiraj CSS cele biblioteke u projekat.

### 2. Razmaci, površine i raspored

- Koristi postojeće Core tokene i ujednačenu skalu 4 / 8 / 12 / 16 / 24 px.
  Standardni unutrašnji razmak sadržaja je 16 px; kompaktni toolbar 12px 16px.
  Ovo su projektne smernice, ne tvrdnja da svaki Core token već postoji.
- Zaglavlje sekcije rezultata/tabele je ukupno 48 px, sa dugmadima ili bez njih,
  na svim širinama. Dugmad su unutar te visine, nikada dodatni vertikalni padding
  ili novi red. Naslov koristi ellipsis + pun tekst u tooltipu; višak header akcija
  ima horizontalni skrol, bez skrivanja funkcija ili povećanja visine.
- Rezultati nisu zalepljeni za ivice sekcije. Kartične liste imaju isti razmak
  i na vrhu i sa leve/desne strane, uključujući prostor uz scrollbar.
- Za isti tip ekrana koristi isti raspored i iste Core komponente; bez nove
  varijante dugmeta, kartice ili modala za svaku stranicu. Generated Source
  layout se ne popravlja nasumičnim lokalnim marginama.
- Kontrole u istom redu poravnaj u gridu; preview polja iste namene su iste
  visine. Helper tekst pripada svom polju. Učitavanje ne ruši visinu rezultata.

### 3. Modali i potvrde

- Jednostavne forme koriste istu kompaktnu širinu:
  `min(560px, calc(100vw - 32px))`. To je NAŠ standard, ne Core default.
  Širinu zadaj kroz podržani modal token/klasu u jednom zajedničkom obrascu.
  Ne prepisuj globalno sve modale, posebno ne one sa tabelama.
- Široki modal je za tabelu, složen izbor ili realno širok sadržaj. Visina
  prati sadržaj uz ograničen viewport i skrol tela, bez velikih praznih rupa.
- Core modal već ima unutrašnji padding. Ne dodaj još jedan oko cele forme.
  Naslov, X i footer preuzimaju isti zajednički kompaktni obrazac.
- Koristi postojeći Core obrazac potvrde kada je dostupan; jednostavna
  potvrda ne dobija poseban složen modal. Ne preskači potvrdu nepovratne radnje.
- Sačuvaj tastaturu, fokus, Escape i pristupačno ime koje Core obezbeđuje.

### 4. Btns i statusi

| Namena | Standard |
| --- | --- |
| Kreiranje / glavna potvrda | Core `primary`, plava |
| Odustani / Zatvori / nazad u uređivanje | Core `closing`, neutralna |
| Brisanje / nepovratni otpis | Core `danger`, crvena + jasna potvrda |
| Odbacivanje nesnimljenih izmena | blago narandžasti warning-soft projektni stil |
| Podešavanje | `secondary` ako njegov izgled u instaliranom Core-u odgovara nameni |

- Ne izmišljaj `variant="warning-soft"`: Core 0.0.85 ga nema. Warning-soft
  zahteva jedan zajednički aplikacioni wrapper/stil ili potvrđenu novu Core
  mogućnost, a ne kopiju proizvoljnog CSS-a na svakoj stranici. Foundation ga
  ne implementira; kada je potreban, implementiraj zajednički obrazac u okviru zadatka.
- Primary je za glavnu/sledeću akciju, ne za svaku kontrolu. Disabled akcija
  ima kratak konkretan razlog kada uslov nije očigledan (i na fokus, ne samo hover).
- Statusi koriste `CoreStatusBadge` ili zajednički wrapper. Aktivno = info,
  čeka pažnju = warning, uspešno/završeno = success, neuspešno/rizično = danger,
  neutralno/arhivirano = neutral. Poslovno mapiranje ne izmišljaj.
- Tekst statusa je uvek vidljiv; boja nije jedini signal.

### 5. Notices, tekst i forme

- `CoreNotice`, kada je dostupan u instaliranom paketu, prati dužinu teksta:
  fit-content, max-width 100%, uredno prelamanje. U flex/grid roditelju spreči
  rastezanje samo tog notice-a. Duga poruka može zauzeti celu širinu.
  Ne sužavaj sve sekcije i ne menjaj Core globalne selektore zbog jednog notice-a.
- CoreNotice je dostupan u proverenom Core-u 0.1.10. Za drugi paket proveri
  njegov javni API; promena paketa i dalje traži odobrenje.
- Upozorenje prikazuje korisniku važan uslov ili posledicu. Ne dodaj trajne
  žute bannere sa internim API napomenama koje pripadaju tehničkoj dokumentaciji.
- Nazive i duge vrednosti skrati sa ellipsis u ograničenoj koloni. Ceo tekst
  ostaje dostupan tooltipom i tastaturom; ne gubi podatak. `min-width: 0`
  na grid/flex detetu sprečava razvaljivanje rasporeda.
- Polja imaju jasnu labelu ili pristupačno ime; placeholder nije jedina labela.
  Obaveznost, greška i razlog dostupni su i bez boje. Ne menjaj validacije radi estetike.

### 6. Pregledi, pretraga i stanja

- Tabela koristi CoreTable. Toolbar pretrage je odvojen od sekcije rezultata;
  kada postoji odobren Source za pretragu/layout, koristi njega umesto custom CSS-a.
- Paginacija je ispod rezultata. Scrollable zona rezultata zadržava prostor
  i blago plavu Core površinu i kada ima malo redova/kartica; ne dodaj lažne redove.
- Search-as-you-type čeka 500 ms od poslednje izmene unosa. Novo kucanje
  poništava prethodni tajmer; Enter može odmah primeniti pretragu. Obična
  polja forme i eksplicitni filter submit ne dobijaju debounce automatski.
- Spinner u inputu pokazuje stvarni zahtev, ne samo čekanje debounce tajmera
  niti samo kucanje. Rezultati imaju loader koji ne ostavlja praznu stranicu.
  Minimalni prikaz loadera je 500 ms protiv blinkanja; ne produžavaj mrežni
  zahtev i ne usporavaj samo kucanje. Ovo pravilo aplikacija treba da implementira;
  Foundation ne dodaje search hook niti menja sve postojeće ekrane.
- Loading, prazna lista, greška i uspeh su različita stanja. Greška ima jasnu
  poruku i smislen retry; bez automatskog ponavljanja upisa nepoznatog ishoda.
- Prazna opciona vrednost je `/`, samo u prikazu, ne u modelu. Ne zameni
  neispravan obavezan podatak lažnom validnom vrednošću i ne sakrivaj dobre redove.

### 7. Responsive i provera

- Proveri najmanje desktop 1440 px, tablet 768 px i telefon 390 px, kao i
  duge nazive, prazne/velike liste, greške i loading. Na uskoj širini kontroliši
  prelom toolbara i koristi odgovarajući responsive prikaz rezultata.
- Hover ne pomera elemente i ne menja debljinu bordera. Fokus je vidljiv;
  icon-only akcije imaju aria-label. Uvaži `prefers-reduced-motion`.
- DesignRules nije dokaz da je ekran vizuelno proveren. U izveštaju navedi
  šta je stvarno testirano i šta čeka potvrdu korisnika.

### 8. Redne akcije tabelarnog pregleda

- Akcije reda su podrazumevano CoreIconButton `appearance="ghost"`, `size="large"`:
  klikabilna površina 36 × 36 px, SVG 22 × 22 px, potez 1.8, zaobljeni krajevi,
  bez vidljivog teksta i bez stalne pune pozadine. Ne menjaj globalno sve Core ikonice.
- Grupa je poravnata desno, vertikalno centrirana, sa razmakom 10 px.
- Pregled/preuzimanje = `primary`; izmena = `secondary`; pauza = `closing`;
  brisanje = `danger`. Boje dolaze iz Core tokena, ne iz naziva akcije ili slike.
- Svaka ikonica ima smislen naziv (`label`/aria-label), tooltip, vidljiv fokus
  i razlog disabled stanja dostupan i tastaturom. Hover ne pomera element.
- Bez akcija nema prazne akcione kolone. Header poslovne akcije su mala tekstualna
  Core dugmad, ne dobijaju ukrasne ikonice samo zato što redne akcije imaju ikonice.
- Ispod 1024 px napredna pretraga tabelarnog patterna otvara fullscreen modal:
  cela širina i dinamička visina ekrana, zaseban skrol polja, dostupan header/footer.
  Ne postavlja se ispod rezultata. Koristi postojeći Core panel/overlay, ne kopiju modala.
