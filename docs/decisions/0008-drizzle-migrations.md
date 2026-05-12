# ADR-0008: Drizzle als alleinige Migrations-Quelle

## Status
Accepted — 2026-05-11

## Kontext
Wir haben zwei Werkzeuge, die jeweils Schema-Migrations verwalten können:

- **Drizzle** als ORM mit eigenem Migrations-System,
- **Supabase CLI** mit eigenem Migrations-Mechanismus (`supabase/migrations/`).

Wenn beide aktiv sind, gibt es zwei Wahrheitsquellen für das DB-Schema. Erfahrung mit ähnlichen Setups zeigt: Solche Doppelungen driften systematisch auseinander — eine Migration wird hier, eine dort gemacht, manuell oder per Studio gefixt, und am Ende weiß niemand mehr, welchen Stand die Datenbank wirklich hat.

Auch **RLS-Policies** und **DB-Funktionen** (für Projektionen, Triggers) gehören zum Schema und müssen versioniert sein.

## Entscheidung
**Drizzle ist die alleinige Quelle für Schema-Änderungen.** Das umfasst:

- Tabellen, Spalten, Indizes, Constraints,
- RLS-Policies (als raw SQL in Drizzle-Migrationen),
- DB-Funktionen, Triggers, Views (als raw SQL in Drizzle-Migrationen),
- Erweiterungen aktivieren (`CREATE EXTENSION pgvector`, `pg_cron`).

Die Supabase-CLI wird **nur für lokale Entwicklung** genutzt (Postgres-Instanz starten, Studio öffnen) — **nicht für Schema-Migrationen**. Der Ordner `supabase/migrations/` wird nicht angelegt.

Drizzle-Migrationen liegen in `packages/db/migrations/` und werden in CI/CD-Pipeline (Vercel-Deployment-Hook oder separater Schritt) gegen die Supabase-Datenbank ausgeführt.

## Konsequenzen
**Positiv:**
- **Eine einzige Wahrheitsquelle** für das Schema.
- Migrations sind in TypeScript-Toolchain integriert — gleiche Sprache, gleicher Workflow wie Anwendungscode.
- Bei einem späteren Wechsel weg von Supabase: alle Migrationen sind portabel (raw SQL läuft auf jedem Postgres).
- Code-Review für Schema-Änderungen läuft im gleichen PR wie der zugehörige Anwendungscode.

**Negativ:**
- RLS-Policies müssen als raw SQL geschrieben werden — Drizzle hat dafür keine Schema-Abstraktion.
- Supabase Studio-Änderungen (z.B. Klick-RLS-Policies) werden **nicht** synchronisiert und müssen verboten werden (Disziplin). Faustregel: Studio nur zum Lesen, niemals zum Schreiben am Schema.
- Bei Konflikten zwischen lokal entwickelter Migration und produktivem Schema muss manuell gemerged werden.

## Alternativen
- **Supabase-CLI-Migrations + Drizzle nur für Typen:** Verworfen. Drift-Risiko zwischen `supabase/migrations/` und dem, was Drizzle erwartet.
- **Beide parallel verwenden:** Verworfen aus den oben genannten Gründen — schlimmstmögliche Welt.
- **Prisma statt Drizzle:** Verworfen. Prisma ist weniger SQL-nah, schwächer im Umgang mit JSONB und rohen Postgres-Features (Views, Triggers, RLS), die wir brauchen.
- **Reine SQL-Migrations (z.B. mit `node-pg-migrate`):** Verworfen. Funktioniert, aber wir verlieren Drizzle-Typen, die wir ohnehin für die Anwendung wollen.
