# ADR-0004: Korrekturen als neue Events

## Status
Accepted — 2026-05-11

## Kontext
Eingaben können falsch sein — sei es durch Tippfehler des Nutzers, durch falsche KI-Extraktion oder durch nachträgliche Erkenntnis („Ach, das war doch 84,3 nicht 83,4"). In klassischen Systemen würde man die betroffene Zeile mit UPDATE überschreiben oder mit DELETE entfernen.

Beides verletzt unsere Architektur:

- **UPDATE** würde die ursprüngliche (falsche) Information vernichten — gleichzeitig aber auch den Lern-Kontext, **warum** die KI/der Nutzer dort falsch lag.
- **DELETE** entfernt nicht nur das Datum, sondern auch jede spätere Möglichkeit, Korrektur-Muster zu analysieren.

Aus [ADR-0001](./0001-event-sourcing.md) folgt zudem strukturell: der Event Store ist append-only.

## Entscheidung
Korrekturen sind **eigene Event-Typen**, die das Original-Event referenzieren:

- `event_corrected` — ein Event ersetzt logisch ein früheres Event. Trägt das korrigierte Payload sowie eine Referenz auf das Original (`corrects_event_id`) und optional einen Grund.
- `event_retracted` — ein Event soll als „nicht passiert" gelten (z.B. doppelt eingegeben). Macht das Original-Event logisch unwirksam, ohne es zu löschen.

Projektionen interpretieren diese Korrekturen beim Aufbau: das aktuelle Projektions-Ergebnis spiegelt den korrigierten Zustand wider, der vollständige Event-Verlauf bleibt jedoch erhalten.

Hard-Delete ist nur erlaubt für:
- rein technische/abgeleitete Daten (Cache, Session-State),
- DSGVO-Pflicht („Recht auf Löschung", spätere Implementation).

## Konsequenzen
**Positiv:**
- Vollständige Historie auch der Fehler bleibt erhalten.
- Korrekturmuster werden auswertbar (welche KI-Extraktionen werden oft korrigiert?).
- Beim Modell-Upgrade: alte Fehl-Extraktionen + Korrekturen können als Training/Validation-Signal genutzt werden.
- Audit-Pflicht (z.B. Gesundheitsdaten) ist strukturell schon erfüllt.

**Negativ:**
- Projektions-Logik muss Korrekturketten korrekt handhaben (`event_corrected` kann wiederum korrigiert werden).
- UI muss zwischen „aktuellem Wert" (Projektion) und „Eingabe-Historie" (Events) unterscheiden, falls letztere angezeigt werden soll.
- Mehr Komplexität in Tests: Korrektur-Szenarien müssen abgedeckt werden.

## Alternativen
- **Soft-Delete (Flag `deleted_at`):** Verworfen. Hängt sich an klassisches CRUD-Denken, verschmiert die Append-Only-Disziplin und kommuniziert keinen Korrektur-Grund.
- **Versions-Spalte auf dem Original-Event mit In-Place-Update der Payload:** Verworfen. Verletzt Append-Only direkt; Lern-Kontext geht verloren.
- **Event-Verlauf nur im Audit-Log, Wahrheit im Projektions-Tisch:** Verworfen. Zweite Wahrheitsquelle → Drift (siehe ADR-0001).
