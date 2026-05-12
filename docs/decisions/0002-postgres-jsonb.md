# ADR-0002: Postgres + JSONB als Speicher

## Status
Accepted — 2026-05-11

## Kontext
Aus [ADR-0001](./0001-event-sourcing.md) folgt, dass wir Events mit gemeinsamem Envelope und typ-spezifischem Payload speichern. Der Payload jedes Event-Typs (`weight_logged`, `meal_logged`, `training_logged`, ...) hat eine eigene Struktur, die sich über die Zeit versioniert weiterentwickeln können muss. Gleichzeitig brauchen wir relationale Integrität für Querverweise (`user_id`, `corrects_event_id`) und effiziente Abfragen über Zeiträume.

Neue Domänen (Koffein, Schlaf, Fokus, Supplements, Hautbild, ...) müssen jederzeit hinzufügbar sein, **ohne Schema-Migration** — siehe Prinzip 8 (Flexible/Modulare Architektur).

## Entscheidung
Wir verwenden **Postgres** als primäre Datenbank, mit **JSONB für Event-Payloads**. Der gemeinsame Envelope (id, user_id, type, version, occurred_at, recorded_at, source, confidence, ...) ist relational typisiert; nur `payload` und `raw_input` sind JSONB.

Drizzle stellt die TypeScript-Typen bereit; Zod (oder ein vergleichbarer Validator) validiert Payload-Strukturen beim Schreiben, diskriminiert nach `type` + `version`.

Für spätere Ähnlichkeitssuche (z.B. Personal Food Memory) nutzen wir **pgvector** — das ist in Supabase Postgres bereits enthalten.

## Konsequenzen
**Positiv:**
- Neue Event-Typen erfordern **keine DB-Migration**, nur einen neuen Validator und Projektions-Handler.
- JSONB ist indexbar (GIN-Indexes), sodass auch Filter über Payload-Felder performant bleiben.
- Relationale Integrität für Querverweise bleibt erhalten.
- pgvector ohne zusätzliche Datenbank verfügbar.
- Volle SQL-Power für analytische Abfragen über Zeitreihen.

**Negativ:**
- JSONB-Indexing erfordert Disziplin — falsche Index-Wahl kann Queries langsam machen.
- Typsicherheit für Payload ist auf Application-Level (Zod), nicht in der DB erzwungen. Eine fehlerhafte Insertion ohne Validierung würde durchrutschen.
- Schema-Änderungen an JSONB-Strukturen sind „still": ohne ADR/Version-Bump merkt man Drift erst spät.

## Alternativen
- **Eine Tabelle pro Event-Typ:** Migration-Hölle bei jeder neuen Domäne, verletzt Prinzip 8 direkt.
- **MongoDB / DocumentDB:** Bessere Schema-Flexibilität, aber schwächere relationale Constraints, schlechtere Analytics-Queries, kein pgvector-Äquivalent in einem Ökosystem.
- **SQLite:** Solo-Use einfach möglich, aber kein managed Hosting für Multi-Device-Zugriff. Langfristig zu eng.
- **Event-Store-Spezialprodukte (z.B. EventStoreDB):** Mehr Operations-Aufwand für einen einzelnen Anwendungsfall, nicht gerechtfertigt bei diesem Umfang.
