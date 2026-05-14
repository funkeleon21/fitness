# CLAUDE.md

Persönliches wissenschaftliches KI-System für Körper, Ernährung, Performance. **Interpretation > Tracking.**

Navigations-Index. Substanz in den verlinkten Dateien.

## Lies das zuerst

| Was | Wo |
|---|---|
| Vision und „Warum" | [docs/vision.md](docs/vision.md) |
| Architektur (5 Schichten) | [docs/architecture.md](docs/architecture.md) |
| Event-Envelope-Schema | [docs/event-model.md](docs/event-model.md) |
| Architecture Decision Records | [docs/decisions/](docs/decisions/) |

## Code-Layout

```
apps/web                 Next.js PWA (React 19, App Router)
packages/core            Event-Typen, Domain, Commands — FRAMEWORK-FREI
packages/db              Drizzle-Schema, Migrations, Projektionen, RLS-Policies
packages/ingestion       Sprache/Foto → Event (LLM-Extraktion)
packages/interpretation  KI-Analysen, Chat-Tools, Context-Provider
```

## Stack

pnpm workspaces, TypeScript Project References, Biome, Vitest. Next.js auf Vercel, PWA-Service-Worker via Serwist. Postgres + Auth + Storage via Supabase. Drizzle ORM. Strict TS (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`).

## Disziplinen (verletzen = Bug)

1. **`packages/core` ist framework-frei** — kein `next/*`, kein `drizzle-orm`, kein DB-Import.
2. **Schreiben nur via Ingestion-Pipeline** — nie direkt in `events`.
3. **Trend statt Tageswert** — UI defaults auf Bewegungsdurchschnitte, nicht Einzelpunkte.
4. **Unsicherheit aussprechen** — keine gerundeten Einzelzahlen ohne Konfidenz/Range.
5. **Neue Migration sofort gegen Prod-DB anwenden** — jede neue Datei unter `packages/db/migrations/` direkt via Supabase-MCP `apply_migration` auf Projekt `cjwgisdobzztljizrnfn` ausführen, bevor der PR gemerged wird. Workflow: [.claude/skills/db-migration/SKILL.md](.claude/skills/db-migration/SKILL.md). Drift-Check: [.github/workflows/migration-drift.yml](.github/workflows/migration-drift.yml).

Weitere harte Regeln in ADRs: Append-only ([0001](docs/decisions/0001-event-sourcing.md), [0004](docs/decisions/0004-korrekturen-als-events.md)), KI schreibt Events nicht Projektionen ([0003](docs/decisions/0003-ki-als-event-quelle.md)), RLS überall ([0009](docs/decisions/0009-rls-ab-tag-1.md)), Drizzle alleinige Migrations-Quelle ([0008](docs/decisions/0008-drizzle-migrations.md)), Projektions-Replay-Pattern ([0010](docs/decisions/0010-projektionen-replay-pattern.md)).

## Sprache

Code/Identifier auf Englisch. Doku, Commits, UI-Texte und Kommunikation mit dem Nutzer auf **Deutsch**.

## Arbeitsweise

1. **Bei Unsicherheit nachfragen.** Lieber Klärungsfrage als 30 Minuten in die falsche Richtung. Besonders bei Architektur-Entscheidungen, irreversiblen Aktionen, neuen Abhängigkeiten.
2. **Empfehlung + Begründung + Alternativen.** Nie nur einen Weg präsentieren, als wäre er der einzige.

## Skills

[.claude/skills/](.claude/skills/) — bei neuer Aufgabe prüfen, ob ein Skill triggert. Vorhanden:

- [chat-domain-integration](.claude/skills/chat-domain-integration/SKILL.md) — bei neuer Domäne/Projektion
- [db-migration](.claude/skills/db-migration/SKILL.md) — bei neuer Drizzle-Migration; wendet sie sofort gegen Prod-DB an
- [doc-keeper](.claude/skills/doc-keeper/SKILL.md) — feuert automatisch vor `gh pr create` (via Hook); prüft Doc-Drift

## Befehle

```bash
pnpm install         # Initial-Setup
pnpm dev             # apps/web starten
pnpm typecheck
pnpm lint            # Biome
pnpm test            # Vitest
pnpm build
```

## Git-Workflow

1. Nie direkt auf `main` pushen (branch-protected, required check `lint · typecheck · test · build`).
2. Jede Änderung als PR auf Feature-Branch (`feat/*`, `fix/*`, `chore/*`, `docs/*`).
3. Auto-Merge: `gh pr merge <n> --auto --squash`. Mergt automatisch sobald CI grün, Branch wird gelöscht.
4. Wenn Branch hinter main: `gh pr update-branch <n>` (strict-Modus).
5. Vercel deployt auto: PR-Branches als Preview, `main` als Production (`fitness-web-self-three.vercel.app`).

## Aktueller Stand

Phase 0+1 (Gewicht) durchgestochen, Mahlzeiten-Domäne + Food-Memory live, Chat-Tools (lesen + schreiben für Gewicht, Mahlzeiten und persönliche Tagesziele) produktiv. Foto-basierte Mahlzeit-Erkennung über `/api/recognize-meal` (Vision-LLM via Langdock), Barcode-Scan über `/api/lookup-barcode` (Open Food Facts). Supabase `cjwgisdobzztljizrnfn` (eu-west-1), Demo-Login via `signInWithPassword`. Offen: echte `ai_interpretation`-Events.
