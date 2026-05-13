# CLAUDE.md

Persönliches wissenschaftliches KI-System für Körper, Ernährung, Performance. **Interpretation > Tracking.**

Diese Datei ist Navigations-Index. Inhalt steht in [docs/](docs/).

## Lies das zuerst

| Was | Wo |
|---|---|
| Vision und „Warum" | [docs/vision.md](docs/vision.md) |
| 10 Kernprinzipien (Entscheidungs-Filter) | [docs/principles.md](docs/principles.md) |
| Architektur (5 Schichten, Datenfluss, Disziplinen) | [docs/architecture.md](docs/architecture.md) |
| Phasen + bewusste Anti-Roadmap | [docs/roadmap.md](docs/roadmap.md) |
| Architecture Decision Records (ADRs) | [docs/decisions/](docs/decisions/) |
| Skills (Workflow-Anleitungen) | [.claude/skills/](.claude/skills/) — z.B. [chat-domain-integration](.claude/skills/chat-domain-integration/SKILL.md) bei neuer Domäne/Projektion |

## Code-Layout

```
apps/web                 Next.js PWA (React 19, App Router)
packages/core            Event-Typen, Domain, Commands — FRAMEWORK-FREI
packages/db              Drizzle-Schema, Migrations, Projektionen, RLS-Policies
packages/ingestion       Sprache/Foto → Event (LLM-Extraktion)
packages/interpretation  KI-Analysen, Hypothesen, ai_interpretation-Events
```

## Stack

- pnpm workspaces, TypeScript Project References, Biome (Lint + Format), Vitest
- Next.js auf Vercel, Postgres + Auth + Storage via Supabase, Drizzle ORM
- Strict TS überall (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`)

## Disziplinen (verletzen = Bug)

1. **`packages/core` ist framework-frei** — kein `next/*`, kein `drizzle-orm`, kein DB-Import.
2. **Schreiben nur via Ingestion-Pipeline** — nie direkt in `events` schreiben.
3. **Append-only auf Domain-Events** — kein UPDATE/DELETE. Korrekturen sind `event_corrected`/`event_retracted`-Events ([ADR-0004](docs/decisions/0004-korrekturen-als-events.md)).
4. **KI schreibt Events, nie Projektionen** — mit `confidence` und `raw_input` ([ADR-0003](docs/decisions/0003-ki-als-event-quelle.md)).
5. **RLS auf jeder Tabelle mit `user_id`** — Default-Deny + „nur eigene Zeilen" ([ADR-0009](docs/decisions/0009-rls-ab-tag-1.md)).
6. **Drizzle ist alleinige Migrations-Quelle** — keine `supabase/migrations/`, kein Supabase-Studio-Schema-Edit ([ADR-0008](docs/decisions/0008-drizzle-migrations.md)).
7. **Trend statt Tageswert** — UI defaults auf Bewegungsdurchschnitte, nicht Einzelpunkte (Prinzip 3).
8. **Unsicherheit aussprechen** — keine gerundeten Einzelzahlen ohne Konfidenz/Range (Prinzip 7).

## Sprache

Code/Identifier auf Englisch. Doku, Commits, UI-Texte und Kommunikation mit dem Nutzer auf **Deutsch**.

## Arbeitsweise

1. **Bei Unsicherheit nachfragen.** Nicht raten, nicht heimlich eine Annahme zementieren. Lieber eine kurze Rückfrage als 30 Minuten in die falsche Richtung. Gilt besonders für: Architektur-Entscheidungen, neue Abhängigkeiten, irreversible Aktionen (DB-Migrationen, Force-Push, Branch-Löschung), grobe UI-Richtungswechsel.
2. **Empfehlung + Begründung + Alternativen.** Wenn eine Entscheidung ansteht, gib zuerst die Empfehlung mit kurzer Begründung („was ich vorschlage und warum"), dann mindestens 2–3 echte Alternativen mit ihren Trade-offs. Nie nur die Empfehlung präsentieren, als wäre sie der einzige Weg.
3. **Format dafür:**
   - **Empfehlung:** … *Warum:* …
   - **Alternative A:** … *Trade-off:* …
   - **Alternative B:** … *Trade-off:* …
4. **Keine stillen Annahmen bei Mehrdeutigkeit.** Wenn der Auftrag mehrere plausible Lesarten zulässt, lieber eine Klärungsfrage stellen, als die falsche Hälfte umzusetzen.

## Befehle

```bash
pnpm install         # Initial-Setup
pnpm dev             # apps/web starten
pnpm typecheck       # Alle Packages
pnpm lint            # Biome
pnpm test            # Vitest, alle Packages
pnpm build           # Alle Packages
```

## Git-Workflow

1. **Nie direkt auf `main` pushen** — main ist branch-protected (Force-Push und Delete verboten, Status-Check `lint · typecheck · test · build` ist required).
2. **Jede Änderung als PR** auf einem Feature-Branch (`feat/*`, `fix/*`, `chore/*`).
3. **Auto-Merge mit Squash:** nach PR-Open `gh pr merge <n> --auto --squash`. Mergt automatisch sobald CI grün ist. Branch wird nach Merge gelöscht.
4. **Wenn der Branch hinter main ist:** `gh pr update-branch <n>` (Branch-Protection läuft im strict-Modus).
5. **Vercel** deployt automatisch auf jeden Push: PR-Branches als Preview, `main` als Production. URLs: `fitness-web-self-three.vercel.app` (Prod), `fitness-web-git-<branch>-funkeleon21s-projects.vercel.app` (Preview).

## Aktueller Stand

Phase 0 komplett, Phase 1 (Gewicht) durchgestochen. Supabase `cjwgisdobzztljizrnfn` (eu-west-1) mit `events`-Tabelle + RLS aktiv. Web-App mit Demo-Login (Leon/Leonie via `signInWithPassword`), Labor-Design v2, manuelle Eintrag-/Korrektur-/Retraction-Flows live. Live unter `fitness-web-self-three.vercel.app`. Offen: NL-Ingestion (Phase 2), echte `ai_interpretation`-Events (Phase 6). Siehe [docs/roadmap.md](docs/roadmap.md).

## Was nicht reingehört

- Generische Fitness-App-Features (Streaks, Pflicht-Journals, Mood-Slider)
- Hard-Deletes auf Domain-Daten
- Direkte Inserts in `events` außerhalb der Ingestion-Pipeline
- KI-Output direkt in Projektionen/UI-State (ohne Event-Zwischenstand)
- Premature Abstractions („später-vielleicht"-Features oder Schichten)
