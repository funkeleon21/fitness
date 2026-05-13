# Architektur

Event-Sourcing mit reproduzierbaren Projektionen. Begründungen in [decisions/](./decisions/), Envelope-Schema in [event-model.md](./event-model.md).

## Schichten

1. **Ingestion** (`packages/ingestion`) — nimmt Sprache/Foto/Freitext/Formular entgegen, produziert typisierte Events mit `source`, `confidence`, `raw_input`.
2. **Event Store** (`packages/db/src/schema`) — eine zentrale `events`-Tabelle mit JSONB-Payload, append-only, RLS auf `user_id`.
3. **Projektionen** (`packages/db/src/projections`) — reine Funktionen aus dem Event-Strom, kein materialisierter Cache. Replay-Pattern siehe [ADR-0010](./decisions/0010-projektionen-replay-pattern.md).
4. **Interpretation** (`packages/interpretation`) — KI-Analysen + Chat-Tools schreiben Events mit Konfidenz und Quellen-Referenzen.
5. **API / UI** (`apps/web`) — liest ausschließlich Projektionen, schreibt nur über Ingestion.

## Datenfluss (Beispiel Gewicht)

```
"Heute morgen 84,3" → Ingestion (NL→Event mit raw_input, confidence)
                    → Event Store (INSERT events)
                    → Projektion (replay nach recorded_at, id)
                    → UI (Trend, nicht Tageswert)
```

## Disziplinen

Harte Regeln stehen in [CLAUDE.md](../CLAUDE.md#disziplinen-verletzen--bug) und in den ADRs. Wichtigste: Append-only auf Domain-Events ([ADR-0001](./decisions/0001-event-sourcing.md), [ADR-0004](./decisions/0004-korrekturen-als-events.md)), KI als Event-Quelle ([ADR-0003](./decisions/0003-ki-als-event-quelle.md)), RLS überall ([ADR-0009](./decisions/0009-rls-ab-tag-1.md)), Drizzle als alleinige Migrations-Quelle ([ADR-0008](./decisions/0008-drizzle-migrations.md)).
