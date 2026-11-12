## {{DECISION_ID}} — {{DATE}} — ProjectFoundationSource {{REVISION}}

Odluka: usvojen početni projektni pravilnik AGENTS.md / DesignRules.md (1.1.0)
i početni workflow DecisionLog.md; projekat je inicijalizovan praznim React/Core
bootstrap-om, bez sadržaja startera. Ovo nije promena poslovne logike.

Razlog: zajednički Core dizajn i jasna uputstva bez kopiranja razvojnih pravila kataloga.

Paketi u trenutku primene (istorijski snapshot, ne instrukcija za pin/downgrade):
{{DEPENDENCIES}}

Stvarno izvršeno:
{{ACTIONS}}

Obim: početni src/public, README.md i index.html. Ponovni poziv ne čisti aplikaciju.
Povratne kopije zamenjenih/obrisanih fajlova: {{BACKUP}}.

Provere: preflight izvora, zavisnosti i kolizija izvršen. Lint/build i browser
NISU izvršeni ovim alatom; agent ih pokreće i dopisuje konkretan rezultat.
