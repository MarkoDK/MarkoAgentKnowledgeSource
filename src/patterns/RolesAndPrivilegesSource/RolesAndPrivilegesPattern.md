# RolesAndPrivilegesSource — 1.0.0

Status: implementacija i provere koda; .planned ostaje do odobrenih stvarnih
desktop/mobile screenshotova i završne transfer provere. Preview: /roles.html.

## Poziv

~~~text
$marko-knowledge-agent Primeni RolesAndPrivilegesSource sa izvornim defaultom.
$marko-knowledge-agent Primeni RolesAndPrivilegesSource koristeći priloženi RolesAndPrivilegesConfig.md.
~~~

Jedini ljudski ulaz je config/RolesAndPrivilegesConfig.md. Tumači nameru,
sinonime „Pregled”, „readonly”, „bez izmene” kao read-only režim. Za nejasan
naziv ili ID role pitaj usred rada i nastavi nezavisne delove. Ne zaključuj
identitet administratora iz naziva ili numeracije konkretne druge aplikacije.

## Payload

Manifest prenosi u src/features/role-settings/:
- app/RolesAndPrivilegesPage.tsx: scaffold; page opcije, kolone, host callbacki.
- app/RolePermissionsDialog.tsx: fixed; editor, potvrde, async tok i zaštite.
- app/rolePermissions.ts: fixed; generički tipovi i male funkcije preduslova.
- app/RolesAndPrivilegesPage.module.css: fixed; Core raspored i responsive stilovi.
- config/RolesAndPrivilegesConfig.md: instructions; aktivni tekst korisnika.

Dokument, manifest, screenshotovi, preview i MockData ostaju u katalogu.
Potrebni su React/ReactDOM 19.3.0 i Core 0.1.12 ili noviji. Ne instaliraj i ne
downgrade-uj pakete. Core style.css ide pre host CSS-a; font nasledi iz hosta.
Bez katalog-only patterns foldera u targetu, kopiranja bootstrap-a ili novog
auth/query sistema. Ovaj Source nema zavisnost od drugog Source-a.

## Prenos

~~~text
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs check-source --source RolesAndPrivilegesSource
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs plan --source RolesAndPrivilegesSource --target <target>
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs apply --source RolesAndPrivilegesSource --target <target>
node <catalog>/.agents/skills/marko-knowledge-agent/scripts/source-transfer.mjs verify --source RolesAndPrivilegesSource --target <target>
~~~

Prati globalni SKILL.md i pregledaj kolizije. Ne preskači .planned zaštitu.
Nakon dozvoljenog apply-a primeni tekst direktno u deklarisane scaffold
tačke, sačuvaj ga kao target RolesAndPrivilegesConfig.md, pa verify/lint/build.
Ne menjaj fixed fajlove radi prolaza. Poveži postojeću traženu rutu/placeholder
ili dozvoljeni AppLayoutConfig; ne dodaj navigaciju bez zahteva.

## Šta se podešava

PAGE: title, tableName, quickSearch, advancedSearch i readOnlyRoleIds.
Default readOnlyRoleIds je ['admin']: to je eksplicitni primer stabilnog ID-ja,
nije backend enum niti pravilo da se svaka rola nazvana Administrator zaključava.
Custom config „Administrator samo Pregled” mapiraj na stvarni host ID.
Ako host koristi broj 1, upiši 1, ne string '1'; ostali ID-jevi su nezavisni.
Ne mešaj ID-jeve privilegija i rola. [] uklanja posebno zaključane role,
ali nikad ne zaobilazi canManage=false. Za read-only red je plavo oko; za Edit
narandžasta olovka. Pregled ima iste filtere i disabled checkboxove, bez Save/reset.
Izbor važi i za otvoreni editor, ne samo za ikonicu u tabeli.

COLUMNS: postojeće CoreTable kolone i metadata brojevi. 0 ostaje 0.
15 po strani, bez size selecta; CoreTable koristi internu paginaciju.
Nema pravljenja nove paginacije ni spoljnog CorePagination na tabeli.
Brza pretraga: 500ms debounce, Enter/lupa/Clear odmah, IME čeka završetak.
Napredni filter je draft do Pretraži; Reset čisti samo taj filter, ne search.
Aktivna rola je uklonjiv CoreFilterChip; ispod 1024px panel je fullscreen.
Header rezultata je 48px; editor ima 10px ispod search/modul toolbar-a.
Nema ranije uklonjenog opisnog heads-up bloka ni bulk-select Buttons.

DATA: roles je kompletan dozvoljeni niz RoleSummary:
{ id, label, userCount, defaultCount, extraCount }. ID je neprazan string ili
celobrojni number, stabilan kroz refresh. Ukupno = defaultCount + extraCount.
Ne filtriraj lokalno samo jednu server stranu. Ako je API paginiran, učitaj
celu dozvoljenu listu ili eksplicitno prilagodi scaffold server upitu.
privileges je kompletan katalog { id, code, label, group, requires: id[] }.
Brojevi, poslovni nazivi i dodele nisu deo fiksnog patterna.

## Host callbacki i bezbednost

Props stranice: roles, privileges, loading, error, canView (default true),
canManage (default false), loadRolePermissions, saveRolePermissions, onSaved,
onDirtyChange. Default podaci su prazni. canView/canManage određuje host iz
stvarnih efektivnih prava; nisu imitacija auth-a ili zamena za backend proveru.
Host mora obezbediti samo dozvoljene podatke. API integracija je samo po zahtevu.

~~~ts
loadRolePermissions(roleId, signal): Promise<{
  roleId, defaultPermissions: PrivilegeId[], extraPermissions: PrivilegeId[]
}>
saveRolePermissions(roleId, extraPermissions, signal): Promise<RolePermissions>
~~~

API adapter prevodi pravi Orval DTO u ove male tipove. Ako backend vraća
effectivePermissions, adapter proverava da je to unija default/extra prava.
Ne piši drugi REST klijent, ne instaliraj query biblioteku i ne izmišljaj rute.
Default i extra liste ne smeju se preklapati; nepoznat ID/duplikat/pogrešna
rola ili nepotpun skup preduslova daju grešku pre editora. Poznate privilegije sa skrivenog search/filter
prikaza moraju ostati u punom Save payload-u. Default dodele se nikad ne menjaju
lokalno ili na osnovu naziva role. Reset šalje extraPermissions=[] posle potvrde.

load/save callbacki i privileges katalog treba da imaju stabilan identitet
dok je editor otvoren (modulske funkcije/useCallback i stabilan query podatak).
Na promenu sesije remountuj stranicu key-em host sessionKey; ne čuvaj draft
prethodnog korisnika. onDirtyChange poveži sa postojećim host navigation guard-om;
modal-close i browser reload imaju lokalnu potvrdu/zaštitu, router je vlasnik hosta.
Promena prava tokom upisa, unmount i abort ne smeju pokrenuti naknadni PUT ili UI uspeh.

Svež load pre save-a poredi baseline i odbija detektovan konflikt. Ovo nije
atomski lock; server/adapter primenjuje ETag/verziju ako postoji. Nema
automatskog retry-a mutacija. Greška zadržava draft. Učitaj aktuelna prava traži
potvrdu odbacivanja drafta. Posle uspeha onSaved dobija stvarni potvrđeni
odgovor; host osvežava listu i korisničke efektivne privilegije. Ne pretvaraj
neuspešan naknadni refetch u tvrdnju da je već uspešan upis propao.

## Provera

Default i custom readOnlyRoleIds; string i numerički ID-jevi; novi domenski
katalog sa preduslovima; default locks; očuvanje skrivenih extras; reset samo
extras; readonly zaštita i gubitak prava između GET/PUT; load/save greške,
dupli klik, unmount, konflikt i dirty-close. Blank host mora lint/build-ovati
bez originalnih aplikacija. Testovi/preview nisu prenosivi payload.
Vizuelno: 1440×900, 768×1024, 390×844; tabela/kartice, panel/modal napredne,
Edit/Pregled editor, toolbar/list razmak, dugi nazivi i footer. Browser samo
uz dozvolu. Screenshotovi moraju biti iz ovog patterna; .planned ostaje do njih.

Dostavljene slike su autorske desktop reference: screenshots/reference-roles-desktop.png
i screenshots/reference-editor-desktop.png. One nisu dokaz pokrenutog novog patterna.
