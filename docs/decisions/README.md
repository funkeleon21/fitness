# Architecture Decision Records

Dieses Verzeichnis enthält **ADRs** — kurze, datierte Dokumente, die jeweils eine wichtige Architekturentscheidung festhalten.

## Format

Jede ADR ist eine einzelne Datei nach dem Schema `NNNN-kurztitel.md`:

```
# ADR-NNNN: Titel

## Status
Accepted | Proposed | Superseded by ADR-XXXX — YYYY-MM-DD

## Kontext
Welches Problem stand zur Entscheidung? Welche Constraints?

## Entscheidung
Was wurde konkret entschieden?

## Konsequenzen
Was folgt daraus — positiv und negativ?

## Alternativen
Welche Optionen wurden abgewogen und verworfen, und warum?
```

## Regeln

1. **Eine ADR pro Entscheidung.** Nicht bündeln.
2. **Append-only.** ADRs werden nicht gelöscht oder substantiell überschrieben. Wenn eine Entscheidung sich ändert: neue ADR schreiben, alte auf „Superseded by ADR-XXXX" setzen.
3. **Datum festhalten** — damit man Entscheidungen in den zeitlichen Kontext einordnen kann.
4. **Kurz halten.** Eine Seite ist das Ziel.
5. **Nicht jede Entscheidung braucht eine ADR.** Faustregel: nur, wenn sie schwer rückgängig zu machen ist oder das Team konkret diskutiert hat.

## Index

| Nr | Titel | Status |
|---|---|---|
| [0001](./0001-event-sourcing.md) | Event Sourcing als Kernpattern | Accepted |
| [0002](./0002-postgres-jsonb.md) | Postgres + JSONB als Speicher | Accepted |
| [0003](./0003-ki-als-event-quelle.md) | KI als Event-Quelle, nicht DB-Schreiber | Accepted |
| [0004](./0004-korrekturen-als-events.md) | Korrekturen als neue Events | Accepted |
| [0005](./0005-monorepo-pnpm.md) | Monorepo mit pnpm workspaces | Accepted |
| [0006](./0006-vercel-hosting.md) | Vercel als Hosting | Accepted |
| [0007](./0007-supabase.md) | Supabase als Postgres + Auth + Storage | Accepted |
| [0008](./0008-drizzle-migrations.md) | Drizzle als alleinige Migrations-Quelle | Accepted |
| [0009](./0009-rls-ab-tag-1.md) | RLS ab Tag 1, auch bei Single-User | Accepted |
