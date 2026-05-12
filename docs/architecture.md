# Architektur

Diese Datei beschreibt die übergreifende technische Struktur. Detailfragen zum Event-Modell stehen in [event-model.md](./event-model.md), Entscheidungen mit Begründung in [decisions/](./decisions/).

---

## Leitidee

Das System folgt einem **Event-Sourcing-Ansatz mit reproduzierbaren Projektionen**:

- **Append-only Events** sind die einzige Wahrheit.
- **Projektionen** (aktueller Zustand, Trends, Aggregate) werden aus Events berechnet und sind jederzeit neu aufbaubar.
- **KI ist Event-Quelle, niemals Wahrheits-Quelle.** Sie interpretiert Sprache/Bilder/Daten und schreibt ihre Ergebnisse als Events mit Konfidenz und Provenance.

Dieser Ansatz ist der direkte Ausdruck von Prinzip 6 (Langfristiges Lernen) und Prinzip 9 (Strukturierte Daten statt KI-Chaos): Wenn in zwei Jahren ein besseres Modell verfügbar ist, kann es die alten `raw_input`-Daten erneut interpretieren und das System wird rückwirkend klüger — ohne dass historische Daten verloren gehen.

---

## Die fünf Schichten

```
┌─────────────────────────────────────────────────────┐
│  5. API / UI                                        │
│     Liest ausschließlich Projektionen.              │
│     Schreibt nur via Ingestion-Schicht.             │
├─────────────────────────────────────────────────────┤
│  4. Interpretation                                  │
│     KI-Analysen, Hypothesen, Empfehlungen.          │
│     Output: ai_interpretation-Events (mit           │
│     Konfidenz + Referenzen auf Quell-Events).       │
├─────────────────────────────────────────────────────┤
│  3. Projections                                     │
│     Materialisierte Sichten aus Events:             │
│     aktuelles Gewicht, 7d-Trend, TDEE-Schätzung,    │
│     Trainings-Volumen pro Muskelgruppe, ...         │
│     Reproduzierbar aus Event-Strom.                 │
├─────────────────────────────────────────────────────┤
│  2. Event Store (Append-only)                       │
│     Die einzige Wahrheit. Postgres + JSONB.         │
│     Niemals UPDATE/DELETE auf Domain-Daten.         │
├─────────────────────────────────────────────────────┤
│  1. Ingestion                                       │
│     Sprache / Foto / Freitext / QR / Formular       │
│     → strukturiertes Event (mit raw_input,          │
│     source, confidence).                            │
└─────────────────────────────────────────────────────┘
```

### 1. Ingestion

Nimmt Eingaben in jeglicher Form entgegen und produziert typisierte Events. Sprache und Bilder gehen durch ein KI-Modell, das **strukturierte Ausgaben mit Konfidenz** zurückgibt. Der ursprüngliche Eingabetext bzw. die Foto-Referenz wird **immer** im Event mitgespeichert (`raw_input`), damit spätere Modelle re-interpretieren können.

Verantwortung: Validierung, Idempotenz, Provenance.
Keine Verantwortung: Domain-Entscheidungen, Empfehlungen.

### 2. Event Store

Eine Tabelle pro Aggregat — startet aber mit **einer zentralen `events`-Tabelle** mit gemeinsamem Envelope. Payload ist JSONB, typisiert pro Event-Typ und versioniert.

Charakteristika:

- **Append-only** für Domain-Events. Korrekturen sind neue Events (`event_corrected`, `event_retracted`), die auf das Ursprungs-Event referenzieren.
- **Idempotenz** über `(source, external_id)`.
- **Versionierung pro Event-Typ** (`type` + `version`) erlaubt Schema-Evolution ohne Migration.
- **Multi-User-fähig** von Anfang an (`user_id`), durchgesetzt über **Row Level Security (RLS)** in Postgres — jede Zeile gehört genau einem User, niemand kann fremde Events lesen oder schreiben. Auch wenn initial nur ein Nutzer existiert.

Details und das vollständige Envelope-Schema: siehe [event-model.md](./event-model.md).

### 3. Projections

Aus dem Event-Strom berechnete Sichten. Zwei Arten:

- **Materialisiert** (eigene Tabellen, von einem Projektions-Worker fortgeschrieben): aktuelles Gewicht, Tagesaggregate Kalorien/Makros, Trainings-Volumen pro Woche/Muskelgruppe.
- **On-the-fly** (Views oder Funktionen): kurzfristige Analysen, Charts, die selten genug abgefragt werden, um Vorausberechnung nicht zu rechtfertigen.

Jede Projektion ist deterministisch aus dem Event-Strom rekonstruierbar — das ist die Skalierbarkeits-Versicherung. Wenn eine Projektion falsch wird, droppen und neu aufbauen.

### 4. Interpretation

Hier lebt die KI-Analyse, die das eigentliche Produkt ausmacht: „Warum stagniert das Gewicht?", „Welcher Hebel wirkt jetzt?", „Welche Hypothese erklärt die Daten?"

Wichtig:

- Interpretationen sind **Events** (`ai_interpretation`), nicht direkte API-Antworten. Sie haben eine Konfidenz und referenzieren die Events, auf denen sie beruhen.
- Eine Interpretation kann veraltet sein (neue Daten kommen) — sie wird dann durch eine neue Interpretation ergänzt, die alte bleibt im Verlauf.
- Empfehlungen sind ebenfalls Events und können vom Nutzer als „hilfreich/nicht hilfreich/ignoriert" markiert werden (eigener Event-Typ) — das wird Trainingsdaten für das Personalisierungs-Modell.

### 5. API / UI

Liest ausschließlich Projektionen. Schreibt nur über Ingestion. Niemals direkte Domain-Events aus dem UI heraus schreiben — alles geht durch die Ingestion-Pipeline, damit Validierung, Provenance und Idempotenz greifen.

---

## Datenfluss (Beispiel: Gewicht)

```
Nutzer öffnet App, sagt: "Heute morgen 84.3"
        │
        ▼
Ingestion: NL → { type: "weight_logged", payload: { kg: 84.3 },
                  occurred_at: heute morgen, raw_input: "Heute morgen 84.3",
                  source: "voice", confidence: 0.95 }
        │
        ▼
Event Store: INSERT in events
        │
        ▼
Projection-Worker: aktualisiert
   - body_state (latest_weight, 7d_avg, 14d_trend)
   - weight_series (für Chart)
        │
        ▼
Interpretation (asynchron, ggf. mit Delay):
   wenn Stagnation erkannt → ai_interpretation-Event:
   { hypothesis: "...", confidence: 0.65,
     based_on_events: [event_id1, event_id2, ...] }
        │
        ▼
UI liest Projektionen + neueste relevante Interpretationen.
```

---

## Architektur-Disziplinen (gelten ab Tag 1)

1. **Pakete-Trennung:** `packages/core` enthält Event-Typen und Domain-Logik, **frei von Framework- und DB-Imports**. Verifizierbar durch Lint-Regel oder Build-Failure.
2. **Schreiben nur via Ingestion:** Kein anderes Modul darf direkt in `events` schreiben. (Konvention zunächst, später per Repository-Pattern erzwingbar.)
3. **Keine Hard-Deletes auf Domain-Daten:** Korrekturen als Events. Hard-Delete nur auf rein technischen/abgeleiteten Daten erlaubt.
4. **Konfidenz ist Pflichtfeld** auf jedem KI-erzeugten Event.
5. **Provenance ist Pflichtfeld:** `source` und (wo möglich) `raw_input` werden immer mitgespeichert.
6. **RLS auf jeder Tabelle mit `user_id`:** Default-Policy „nur eigene Zeilen". Eine Tabelle ohne RLS gilt als Bug.
7. **Eine Migration-Quelle:** Schema-Änderungen ausschließlich via Drizzle-Migrations (inkl. RLS-Policies als raw SQL). Supabase-CLI-Migrations werden nicht benutzt, um Konflikte zwischen zwei Wahrheitsquellen zu vermeiden.

---

## Skalierung — was bewusst aufgeschoben wird

Diese Lösungen sind **nicht** Teil der initialen Architektur, aber das Design schließt sie nicht aus:

- Event-Partitioning nach Zeit (relevant ab Millionen von Events — Jahre weg)
- CQRS mit separaten Read-DBs
- Message Bus (z.B. NATS/Kafka) zwischen Schichten — aktuell reicht direkter Funktionsaufruf
- Edge-Caching für Projektionen
- Eigene Background-Worker-Infrastruktur (vorerst reicht Vercel Cron + Supabase pg_cron)

Wichtig ist nur, dass die jetzige Struktur diese Schritte **nicht verbaut**.

---

## Tech-Stack (Stand: initial)

| Schicht | Wahl | Begründung |
|---|---|---|
| Sprache | TypeScript | Geteilt zwischen Web/RN/Backend |
| Frontend | Next.js (App Router), PWA | Schneller Start, später RN möglich |
| Hosting | Vercel | Native Next.js-Integration, Preview-Deployments, Cron-Jobs |
| Backend | Next.js Route Handlers / Server Actions | Monolithisch reicht für Solo-Nutzung; später extrahierbar |
| DB | Postgres (via Supabase) + JSONB | Beste JSON+Relational-Kombination; pgvector bereits dabei |
| Auth | Supabase Auth | RLS-Integration out-of-the-box, Multi-User-fähig |
| Storage | Supabase Storage | Fotos (Mahlzeiten, Körper), S3-kompatibel |
| ORM | Drizzle | SQL-nah, gut für JSONB, typsicher, alleinige Migrations-Quelle |
| Background-Jobs | Vercel Cron + Supabase pg_cron | Projektionen (pg_cron in-DB) + zeitgesteuerte App-Jobs (Vercel) |
| Monorepo | pnpm workspaces | Schnell, ausgereift |
| Tests | Vitest | Schnell, TS-nativ |
| KI | LLM via API (Provider TBD) | Strukturierte Outputs |

Begründungen für die nicht-offensichtlichen Entscheidungen kommen in `docs/decisions/`.

### Hosting-Modell

```
Browser/PWA  ──HTTPS──▶  Vercel (Next.js App + Server Actions)
                              │
                              ├──▶ Supabase Postgres (Event Store + Projektionen, mit RLS)
                              ├──▶ Supabase Storage (Fotos)
                              ├──▶ Supabase Auth (User-Session via Cookie)
                              └──▶ LLM-Provider (Ingestion, Interpretation)

Hintergrund-Aufgaben:
  - Vercel Cron       ──▶ Next.js Route   ──▶ Supabase (z.B. tägliche Auswertungen)
  - Supabase pg_cron  ──▶ SQL-Funktionen  (z.B. Projektions-Refresh)
```

Lock-in-Realität: Daten sind portabel (Postgres-Dump). Bei Bedarf läuft Supabase auch self-hosted (Open Source). Vercel-spezifische APIs werden vermieden, damit Next.js auf jedem Node-Host läuft.

### Lange laufende KI-Workloads

Vercel-Functions haben Timeouts (10–300s je nach Plan). Längere Analysen (z.B. „interpretiere die letzten 6 Monate") werden **asynchron** verarbeitet:

- Trigger schreibt ein `analysis_requested`-Event
- Background-Worker (Vercel Cron / Inngest / Supabase Edge Function) liest, arbeitet, schreibt `ai_interpretation`-Event zurück
- UI pollt oder abonniert Realtime-Updates

Wird erst ab Phase 6 (KI-Interpretation) konkret relevant — Architektur ist aber bereits drauf vorbereitet.
