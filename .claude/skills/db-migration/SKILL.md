---
name: db-migration
description: Use when generating a new Drizzle migration (e.g. via `pnpm db:generate`), modifying a Drizzle schema under packages/db/src/schema/, or creating a file under packages/db/migrations/. Ensures the new migration is immediately applied against the production Supabase project `cjwgisdobzztljizrnfn` via the Supabase MCP `apply_migration` tool, so dev/prod schemas don't drift apart and the next Vercel deploy doesn't break on missing tables/columns/constraints.
---

# DB-Migration anwenden

`drizzle-kit generate` schreibt SQL als Datei nach `packages/db/migrations/`, wendet sie aber **nicht** an. Wenn die Datei nur committed wird, läuft der nächste Vercel-Deploy gegen ein veraltetes Schema → 500er in Prod. Dieser Skill schließt die Lücke: Datei generieren → sofort gegen die Supabase-Prod-DB anwenden → committen.

Begleitet wird der Skill vom Drift-Check in [.github/workflows/migration-drift.yml](../../../.github/workflows/migration-drift.yml) — schreit im PR, falls eine lokale Migration fehlt.

## Wann diesen Skill anwenden

- Du hast ein Drizzle-Schema unter `packages/db/src/schema/` geändert.
- Du hast `pnpm db:generate` ausgeführt und eine neue Datei in `packages/db/migrations/` liegt.
- Der Nutzer sagt sinngemäß „neue Migration ausführen / anwenden".
- Der CI-Drift-Check hat geschrien, dass eine lokale Migration nicht in der DB ist.

## Schritte

### 1. SQL prüfen

Lies die neue Datei unter `packages/db/migrations/000X_<name>.sql`. Worauf achten:

- **Destruktive Statements** (`DROP TABLE`, `ALTER ... DROP COLUMN`, `DROP CONSTRAINT`) → beim Nutzer rückfragen, nicht stillschweigend ausführen.
- **CHECK-Constraints / `NOT NULL`-Spalten**, die gegen Bestandsdaten failen könnten → vorher mit `execute_sql` prüfen, ob die Bedingung auf alle existierenden Zeilen zutrifft.
- **`CREATE TABLE` mit `user_id`** → Migration muss auch `ENABLE ROW LEVEL SECURITY` + Policies enthalten (Disziplin 5, [ADR-0009](../../../docs/decisions/0009-rls-ab-tag-1.md)). Drizzle erzeugt das, wenn die Tabelle in `schema/` korrekt mit `pgPolicy(...)` definiert ist — wenn die Policies in der generierten Datei fehlen, ist das ein Bug im Schema, nicht in der Migration.

### 2. Aktuellen Stand prüfen

- MCP: `list_migrations` auf `project_id` `cjwgisdobzztljizrnfn`.

Vergleiche mit `ls packages/db/migrations/*.sql`. Wenn frühere Migrationen lokal existieren, aber in der DB fehlen, in **Datei-Reihenfolge** nachziehen (0003 vor 0004), nicht nur die neueste anwenden.

### 3. Migration anwenden

- MCP: `apply_migration` auf `project_id` `cjwgisdobzztljizrnfn`.
  - `name`: Dateiname ohne `.sql` (z.B. `0004_goofy_wong`).
  - `query`: Inhalt der Datei. Die `--> statement-breakpoint`-Kommentare sind nur für `drizzle-kit migrate` — beim direkten Apply via MCP optional, schaden aber nicht.

### 4. Verifizieren

- MCP: `list_migrations` — die neue Migration muss in der Liste auftauchen.
- Bei neuen Tabellen: `execute_sql` mit `SELECT count(*) FROM <neue_tabelle>` (sollte `0` zurückgeben, nicht „relation does not exist").
- Bei neuen Spalten: `execute_sql` mit `SELECT <neue_spalte> FROM <tabelle> LIMIT 0`.

### 5. Commit

Erst nach erfolgreichem `apply_migration` und grünem `pnpm typecheck` committen. Die `.sql`-Datei selbst und der zugehörige `meta/_journal.json`-Eintrag gehören in den Commit. Im Commit-Body kurz erwähnen, dass die Migration bereits gegen die Prod-DB angewandt wurde — sonst weiß der zukünftige Leser nicht, ob er sie noch ausführen muss.

## Anti-Muster

- **PR mergen, bevor Migration auf Prod-DB läuft** — Vercel deployt sofort und der neue Code findet das alte Schema vor. Beobachtbar als 500er nach Merge.
- **Migration manuell im Supabase-Studio ausführen** — bricht Drizzle als alleinige Quelle ([ADR-0008](../../../docs/decisions/0008-drizzle-migrations.md)) und entkoppelt das Drizzle-Tracking vom DB-Stand.
- **CHECK-Constraint auf bestehende Daten ohne Vorab-Check** — der `ALTER TABLE ... ADD CONSTRAINT` failt, sobald eine einzige Zeile die Bedingung verletzt. Vorher mit `execute_sql` zählen.
- **Mehrere Migrationen in falscher Reihenfolge anwenden** — Drizzle-Tracking zeigt sie dann in Apply-Reihenfolge statt Dateiname-Reihenfolge. Schema ist trotzdem korrekt, aber `drizzle-kit migrate` gegen eine frische DB sortiert nach Dateiname — Inkonsistenz vermeidbar.
- **Migration committen ohne anzuwenden** — der CI-Drift-Check fängt das, aber besser direkt richtig machen.
- **Roll-Forward-Migrationen verwenden, um eine fehlerhafte Migration zu „reparieren"** — wenn die fehlerhafte Migration noch nicht in Prod ist: lokal löschen + Schema fixen + neu generieren. Wenn sie schon in Prod ist: neue korrigierende Migration drauf. Niemals die alte Datei nachträglich editieren — Drizzle bemerkt das nicht und Prod bleibt im falschen Zustand.
