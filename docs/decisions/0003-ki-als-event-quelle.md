# ADR-0003: KI als Event-Quelle, nicht DB-Schreiber

## Status
Accepted — 2026-05-11

## Kontext
Die KI ist ein zentraler Bestandteil des Systems: sie übersetzt Sprache und Bilder in strukturierte Daten und produziert später Interpretationen und Hypothesen. Gleichzeitig ist sie:

- **fehleranfällig** (Halluzinationen, Fehl-Extraktionen, falsche Konfidenz),
- **nicht-deterministisch** (gleicher Input kann unterschiedliche Outputs erzeugen),
- **wechselbar** (Modelle werden besser, Anbieter wechseln, Prompts ändern sich).

Wenn die KI direkt in den Wahrheitszustand (Projektionen, Aggregate, App-Datenbank) schreibt, gehen Provenance und Reproduzierbarkeit verloren. Eine Korrektur eines KI-Fehlers wird zur Detektivarbeit.

## Entscheidung
Die KI schreibt **niemals direkt** in Projektionen oder Anwendungs-Tabellen. Stattdessen produziert sie **Events** mit:

- vollständigem `raw_input` (Originaltext, Bild-Referenz),
- expliziter `confidence`,
- `source` (welches Modell, welche Version, welcher Prompt-Hash),
- ggf. `based_on_events` (welche Events flossen in eine Interpretation ein).

Diese Events durchlaufen denselben Validierungs- und Projektions-Pfad wie jede andere Eingabe.

## Konsequenzen
**Positiv:**
- KI-Output ist **reproduzierbar**: das gleiche Event lässt sich später nachvollziehen, korrigieren oder reinterpretieren.
- **Provenance** ist immer klar: man sieht, welches Modell wann was geschrieben hat.
- **Modell-Upgrades** sind sicher: ein besseres Modell kann alte `raw_input`-Felder neu interpretieren und neue Events erzeugen, ohne dass alte Daten zerstört werden.
- KI-Fehler werden zu Daten: man kann analysieren, bei welchen Eingabearten welche Modelle versagen.

**Negativ:**
- Mehr Indirektion: KI-Output landet nicht sofort sichtbar im UI, sondern erst nach Projektions-Update.
- Höheres Schreibvolumen.
- Disziplin nötig: die Versuchung, „einfach mal eben" KI-Output direkt in eine Tabelle zu schreiben, ist groß und muss bewusst widerstanden werden.

## Alternativen
- **KI schreibt direkt in strukturierte Tabellen:** Verworfen. Keine Provenance, keine Reproduzierbarkeit, Modell-Updates zerstörerisch.
- **KI nur zur Laufzeit, keine Persistierung:** Verworfen. Verhindert langfristiges Lernen und Re-Interpretation komplett.
- **KI schreibt Events, aber ohne `raw_input`:** Verworfen. `raw_input` ist die einzige Versicherung gegen schlechte Modelle von heute.
