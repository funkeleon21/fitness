# ADR-0010: Replay-Pattern für Projektionen

## Status
Accepted — 2026-05-13

## Kontext
[ADR-0004](./0004-korrekturen-als-events.md) legt fest, **dass** Korrekturen eigene Events sind (`event_corrected`, `event_retracted`). Wie eine Projektion diese Events beim Replay korrekt interpretiert, blieb offen — mit der Folge, dass die ersten beiden Projektionen (`weight`, `meal`) jeweils mit den gleichen latenten Bugs ausgeliefert und nachträglich gefixt wurden (#14, #16):

1. **Sortierung nach `occurred_at`** — Korrektur-Events tragen ihr eigenes `occurred_at` und können *vor* dem Ziel-Event liegen (z.B. „Ich logge heute, dass mein gestriges Gewicht falsch war"). Beim Replay greift `byId.get(corrects_event_id)` dann ins Leere und die Korrektur wird **still ignoriert**.
2. **Keine Korrekturketten** — ein `event_corrected`, das wiederum korrigiert wird, fand kein Ziel mehr in der `byId`-Map. Die zweite Korrektur fiel raus.
3. **Kein retract-of-correction** — eine zurückgezogene Korrektur konnte nicht in den vorherigen Zustand zurückfallen.
4. **Vollständiger Replace bei partiellen Korrekturen** — bei Mahlzeiten kann eine Korrektur nur ein einzelnes Feld (`label`, `kcal`, …) ändern. „Letzte Korrektur gewinnt" hätte vorherige Feldänderungen überschrieben.

Drei weitere Domänen sind absehbar (`training_logged`, `sleep_logged`, `body_measurement`). Ohne kanonisches Pattern wiederholt sich der Bug.

## Entscheidung
Jede Projektion über Domain-Events folgt diesen Regeln:

1. **Reine Funktion + Adapter.** Die Projektionslogik ist eine reine `project<Domain>Events(rows, now)`-Funktion. Der DB-Adapter (`get<Domain>Projection`) macht nur `SELECT` und ruft die reine Funktion auf. So lässt sich die Logik ohne DB-Mock testen.
2. **Stabile Log-Reihenfolge nach `recorded_at, id`.** Sortierung sowohl im SQL (`.order('recorded_at').order('id')`) **und** defensiv in der reinen Funktion. `recorded_at` ist die Wall-Clock-Zeit beim Append und respektiert die kausale Reihenfolge im Event-Log. `id` ist Tiebreaker bei identischem Sub-µs-Timestamp.
3. **Korrekturketten via Indirection-Map.** Eine `correctionTargetById`-Map löst eine Kette `meal → correction1 → correction2 → correction3` auf das ursprüngliche Domain-Event auf. Jede Korrektur wird mit ihrer Insert-Reihenfolge (`order`) gespeichert.
4. **Retract-of-Correction explizit aufgelöst.** Eine `event_retracted` mit `retracts_event_id = <correction.id>` markiert die Korrektur als zurückgezogen. Beim finalen Overlay wird sie übersprungen — die vorherige Korrektur (oder das Original) bleibt aktiv.
5. **Field-wise Overlay statt Replace.** Für Domänen mit partiellen Korrekturen (`meal`: nur `label`, nur `kcal` …) werden alle nicht-retracted Korrekturen in Log-Reihenfolge feldweise auf das Original-Event gelegt. Für Domänen mit nur einem Wert (`weight.kg`) reduziert sich das zur Identität von „letzte Korrektur gewinnt".
6. **Tests in Schwester-Datei `<name>.test.ts`.** Mindestabdeckung: Trends/Tagestotals, unsortierte Inputs, Korrekturketten, retract-of-correction (Fallback), retract-of-meal/weight (Entfernung aus Serie).

Referenz-Implementierungen: [packages/db/src/projections/weight.ts](../../packages/db/src/projections/weight.ts) (Single-Field-Replace) und [packages/db/src/projections/meal.ts](../../packages/db/src/projections/meal.ts) (Partial-Overlay).

## Konsequenzen
**Positiv:**
- Korrekturen können in beliebiger zeitlicher Reihenfolge eingehen, ohne dass die Projektion sie still verliert.
- Projektionslogik ist ohne DB-Mock testbar — pure Funktion + Schwester-Test.
- Neue Domänen können das Pattern 1:1 übernehmen (Skill `chat-domain-integration` Schritt 0).
- Robust gegen späteren Event-Reimport/Migration: keine Annahmen über Insert-Reihenfolge in Datenbank-Operationen.

**Negativ:**
- Projektionslogik ist länger als ein naiver `byId`-Replay (ca. 60 vs. 30 Zeilen).
- Zwei Sortierungen — eine im SQL, eine in der reinen Funktion. Bewusst redundant, weil die pure Funktion außerhalb des Adapters aufrufbar bleibt (Tests, künftiger Stream-Replay).
- Tests sind verpflichtend, nicht optional — sonst regrediert das Pattern.

## Alternativen
- **Nur SQL-Sortierung, keine Re-Sortierung in der reinen Funktion:** Verworfen. Die reine Funktion wäre dann nicht mehr eigenständig testbar — Tests müssten die Sortierung selbst durchführen, was die Bug-Klasse „Tests sortieren anders als Produktion" eröffnet.
- **`occurred_at` weiternutzen, dafür Korrekturen auf das `occurred_at` des Ziel-Events setzen:** Verworfen. Schiebt die Komplexität in die Ingestion-Pipeline und verletzt die Semantik („dieses Event ist um X Uhr passiert" wäre dann nicht mehr wahr).
- **Snapshot-basierte Projektion (Materialized View / Cache-Tabelle):** Aufgeschoben. Bei < 10k Events pro Nutzer ist Replay-from-Scratch billig genug. Wenn die Latenz später drückt: separate ADR.
- **Latest-Correction-Wins für alle Domänen (wie ursprünglich bei `weight`):** Verworfen. Funktioniert nur bei Single-Field-Domänen. `meal` und alle künftigen Multi-Field-Domänen brauchen Field-wise Overlay.
