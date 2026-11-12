---
name: marko-knowledge-agent
description: Apply a named MarkoAgentKnowledgeSource pattern, initialize a fresh Vite project with a clean React/Core bootstrap and project rules, or interpret a natural-language config and update supported configuration in a target React/Core project. Not for authoring the knowledge catalog.
---

# Marko KnowledgeSource — APM ulaz

Ovaj fajl samo pronalazi instalirani paket; ne sadrži kopiju kataloga.

1. U ciljnom projektu pronađi MarkoAgentKnowledgeSource unutar apm_modules.
   Uobičajena putanja je apm_modules/MarkoDK/MarkoAgentKnowledgeSource.
   Ako se razlikuje, proveri apm.lock.yaml i pronađi paket čiji apm.yml ima
   name: marko-agent-knowledge-source. Ne koristi autorov lokalni checkout.
   Ako paket nedostaje ili je izbor dvosmislen, prijavi problem instalacije.
2. Iz tog paketa pročitaj .agents/skills/marko-knowledge-agent/SKILL.md.
   To je jedini globalni ugovor. Ne čitaj razvojni AGENTS.md paketa.
3. Katalog i izvršne skripte ostaju u tom paketu, read-only. U komandama
   <catalog> znači root pronađenog paketa; <target> je root React projekta.
   Ne kopiraj katalog, skripte ili druge skillove u aplikaciju.

Ova APM verzija podržava ProjectFoundationSource i AppShellSource.
Instalacija sama ne primenjuje nijedan pattern. Posle pronalaska ugovora
izvrši korisnikov poziv kroz njegov postojeći plan/apply/verify workflow.
