# ADR-0001: Event Sourcing als Kernpattern

## Status
Accepted — 2026-05-11

## Kontext
Das System soll über Jahre hinweg persönliche Daten zu Körper, Ernährung, Training und Verhalten sammeln und diese mit zukünftig besseren KI-Modellen reinterpretieren können. Eine wichtige Designanforderung aus der Vision: Wenn in zwei Jahren ein besseres LLM verfügbar ist, sollen alte Sprachnotizen und Foto-Eingaben neu interpretiert werden können, ohne dass historische Daten verloren gehen (siehe [principles.md](../principles.md), Prinzip 6).

Klassische CRUD-Modelle löschen oder überschreiben Informationen beim Update. Damit gehen Korrekturkontext, ursprüngliche Eingabeform und Interpretationsverlauf verloren — genau die Daten, die langfristiges Lernen ermöglichen würden.

## Entscheidung
Alle Domain-Daten werden als **append-only Events** in einer zentralen `events`-Tabelle gespeichert. Der aktuelle Zustand sowie Aggregate, Trends und Sichten werden als **Projektionen** aus dem Event-Strom berechnet und sind jederzeit aus dem Event-Log neu aufbaubar.

Korrekturen sind neue Events (`event_corrected`, `event_retracted`), siehe [ADR-0004](./0004-korrekturen-als-events.md). Es gibt **kein UPDATE oder DELETE auf Domain-Events**.

## Konsequenzen
**Positiv:**
- Historische Roh-Eingaben (`raw_input`) bleiben vollständig erhalten und können mit besseren Modellen reinterpretiert werden.
- Jede Analyse ist reproduzierbar: identischer Event-Strom → identische Projektion.
- Korrekturen werden selbst zu Lerndaten (welche Fehler macht die KI bei welchen Eingaben?).
- Audit-Trail kommt umsonst.

**Negativ:**
- Initialer Komplexitäts-Aufschlag: Projektionen müssen gebaut und gepflegt werden.
- Schreibvolumen ist leicht höher (jedes Update = neues Event statt In-Place-Mutation).
- Entwickler müssen Event-Sourcing-Denken internalisieren — kein Default-Wissen.
- Lesepfade müssen über Projektionen gehen, nicht direkt über Events; das ist eine Disziplin, die durchgehalten werden muss.

## Alternativen
- **Klassisches CRUD:** Verworfen. Historische Re-Interpretation wäre unmöglich, was Prinzip 6 direkt verletzt.
- **CRUD + separates Audit-Log:** Verworfen. Zwei Wahrheitsquellen driften erfahrungsgemäß auseinander, und das Audit-Log wird selten als Erstklasse-Datenquelle behandelt.
- **Event Sourcing mit Snapshot-Tabellen statt Projektionen:** Konzeptionell ähnlich; Projektionen sind nur eine spezielle Form davon und für unseren Anwendungsfall klarer.
