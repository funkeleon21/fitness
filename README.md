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
pnpm typecheck
pnpm dev
```

Voraussetzungen: Node ≥ 20, pnpm ≥ 9.
