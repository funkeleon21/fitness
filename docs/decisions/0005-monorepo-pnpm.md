# ADR-0005: Monorepo mit pnpm workspaces

## Status
Accepted — 2026-05-11

## Kontext
Die Vision sieht langfristig mindestens zwei Clients vor: eine Next.js-basierte PWA jetzt, und potenziell eine React-Native-App später. Davon unabhängig soll die **Domain-Logik framework-frei** sein (Event-Typen, Validierung, Berechnungs-Heuristiken), damit sie in beiden Clients und im Backend identisch laufen kann (siehe [architecture.md](../architecture.md), Disziplin 1).

Aus diesen Zielen folgen drei strukturelle Anforderungen:

1. Domain-Code muss in einem eigenen Package liegen, das **strukturell** keine Framework-Abhängigkeiten haben kann (nicht nur per Konvention).
2. Mehrere Apps/Pakete müssen sich Code teilen können, ohne über npm-Publikation zu gehen.
3. Migration zu einem zweiten Client (RN) später soll keine große Umstrukturierung erfordern.

## Entscheidung
Wir verwenden **pnpm workspaces** als Monorepo-Tool, mit folgender Top-Level-Struktur:

```
apps/
  web/                 # Next.js PWA
packages/
  core/                # Event-Typen, Domain-Logik (framework-frei)
  db/                  # Drizzle-Schema, Migrations, Projektions-Logik
  ingestion/           # Sprache/Bild → Event
  interpretation/      # KI-Analysen, Hypothesen
```

TypeScript Project References regeln Build-Reihenfolge und Typ-Sichtbarkeit.

**Turborepo wird nicht initial eingeführt** — pnpm-native `--filter`-Befehle reichen für Solo-Nutzung. Turborepo kann später dazu, wenn Build-Caching relevant wird.

## Konsequenzen
**Positiv:**
- Klare strukturelle Grenzen: `packages/core` kann technisch keinen `next/*`-Import enthalten, ohne dass der Build bricht.
- Neue Clients (RN-App, CLI-Tool) sind einfach hinzufügbar: neuer Ordner in `apps/`, `packages/core` wiederverwenden.
- pnpm ist schnell, Disk-effizient und gut etabliert.
- TS Project References geben sauberes Inkrement-Building.

**Negativ:**
- Etwas mehr initialer Setup-Aufwand als ein Single-Package-Projekt.
- Pfad-Imports werden komplexer (Workspace-Aliases statt relative Pfade).
- IDE-Setup muss Monorepo korrekt erkennen (in der Regel kein Problem mit VSCode/JetBrains, aber zu beachten).
- Build-Reihenfolge muss bedacht werden, wenn Pakete sich gegenseitig konsumieren.

## Alternativen
- **Single-Package mit `src/core/`, `src/db/` etc.:** Verworfen. Trennung ist nur Disziplin, kein struktureller Zwang. Migration zu echtem Monorepo später ist mühsam (Imports, Git-History).
- **Nx oder Turborepo von Anfang an:** Verworfen. Mehrwert kommt erst bei vielen Paketen und CI-Caching; aktuell Overkill.
- **Polyrepo (eigenes Repo pro Paket):** Verworfen. Für Solo-Nutzung zu viel Synchronisations-Aufwand.
- **npm/yarn workspaces statt pnpm:** Verworfen. pnpm ist signifikant schneller und Disk-effizienter; keine Vorteile bei den Alternativen für diesen Use Case.
