# DashboardConfig

Uputstvo agentu; piši običnim rečenicama. Ovo nije runtime config.

## Gornje kartice

Šest kartica: Ukupno stavki, Nove stavke, U obradi, Na čekanju,
Završene stavke, Stornirane stavke. Vrednosti i akcije daje aplikacija.
Bez podataka prikaži /; ne izmišljaj statistiku.
Za uklanjanje napiši „Bez kartica”. Za drugi broj navedi željene kartice.

## Prvi red

Levo: linijski grafikon, Mesečni rezultati, podaci monthly.
Period 3/6/12 meseci; podrazumevano poslednjih 6.
Desno: pizza chart, Raspodela po statusima, podaci statuses.

## Drugi red

Levo: tabela, Poslednje stavke, podaci recentItems.
Desno: tabela, Poslednje aktivnosti, podaci recentActivities.
Obe prikazuju najviše 5 zapisa; naziv/podnaslov i datum.
Status kolonu i bedž prikaži samo kada taj skup podataka ima status.
Statusna traka i bedž koriste isti ton; custom color važi za oba.
Bez statusa nema Status kolone; ostaje neutralna plava oznaka reda.
Prikaži sve i pregled zapisa poveži samo kada navedem stvarne akcije.

## Podaci i povezivanje

Default nema API-ja, ruta ni mock podataka. Podatke prima kroz props.
Zamena vrste prikaza zadržava podatke, naslov i akcije postojećeg slota.
Nove podatke/kolone/akcije opisaću ovde. Ne izmišljaj API ni navigaciju.
Stanja učitavanja, greške i prazni rezultati su nezavisni po panelu.

---

Podržano u oba reda: tabela / pizza chart (kružni, donut) / linijski grafikon.
Obična lista nije podržana. Sinonime tumači po nameri; ako je nejasno, pitaj
tokom rada pre izmene tog slota, a ostale jasne delove nastavi.
Jedna tabela preko celog reda: „Prvi red: jedna tabela preko cele širine”.
Tablet/telefon zadržavaju redosled slotova i prelamaju ih u jednu kolonu.
