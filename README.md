# Fitness

Persönliches, wissenschaftlich fundiertes KI-System für Körper, Ernährung und Performance. Kein klassischer Tracker.

## Doku

[Vision](docs/vision.md) · [Architektur](docs/architecture.md) · [Event-Modell](docs/event-model.md) · [ADRs](docs/decisions/README.md)

## Struktur

```
apps/web                 Next.js PWA
packages/core            Event-Typen, Domain-Logik (framework-frei)
packages/db              Drizzle-Schema, Migrationen, Projektionen
packages/ingestion       Sprache/Foto → Event
packages/interpretation  KI-Analysen, Chat-Tools
```

## Setup

```bash
pnpm install
cp .env.example .env.local           # NEXT_PUBLIC_SUPABASE_* eintragen
pnpm typecheck
pnpm dev                              # http://localhost:3000
```

Voraussetzungen: Node ≥ 20, pnpm ≥ 9.

## Datenbank

Schema-Änderungen ausschliesslich via Drizzle:

```bash
pnpm --filter @fitness/db db:generate   # Migration aus Schema-Änderung
pnpm --filter @fitness/db db:migrate    # Anwenden (DATABASE_URL nötig)
```
