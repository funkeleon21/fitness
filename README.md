# Fitness

Persönliches, wissenschaftlich fundiertes KI-System für Körper, Ernährung und Performance.

Kein klassischer Kalorientracker — ein langfristig lernendes System, das Daten interpretiert statt nur sammelt.

## Doku

- [Vision](docs/vision.md) — das langfristige „Warum"
- [Prinzipien](docs/principles.md) — 10 Entscheidungs-Filter
- [Architektur](docs/architecture.md) — Schichten, Datenfluss, Disziplinen
- [Roadmap](docs/roadmap.md) — Phasen und bewusste Anti-Roadmap
- [Architecture Decisions](docs/decisions/README.md) — ADRs

## Struktur

```
apps/web                 Next.js PWA
packages/core            Event-Typen, Domain-Logik (framework-frei)
packages/db              Drizzle-Schema, Migrationen, Projektionen
packages/ingestion       Sprache/Foto → Event
packages/interpretation  KI-Analysen, Hypothesen
docs/                    Vision, Prinzipien, Architektur, ADRs
```

## Setup

```bash
pnpm install
cp .env.example .env.local           # NEXT_PUBLIC_SUPABASE_* eintragen
pnpm typecheck
pnpm dev                              # http://localhost:3000
```

Voraussetzungen: Node ≥ 20, pnpm ≥ 9.

### Datenbank

Supabase-Projekt: `cjwgisdobzztljizrnfn` (eu-west-1).
Schema-Änderungen ausschliesslich via Drizzle:

```bash
# Neue Migration aus Schema-Änderung generieren
pnpm --filter @fitness/db db:generate

# Anwenden (DATABASE_URL in .env.local nötig — Postgres-URI aus Supabase-Dashboard)
pnpm --filter @fitness/db db:migrate
```

### Auth

Login per Magic-Link-Email (Supabase Default). Redirect-URL `http://localhost:3000/auth/callback` ist im Supabase-Dashboard zu erlauben (Auth → URL Configuration), bevor sich der erste Nutzer registriert.
