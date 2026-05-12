# ADR-0009: RLS ab Tag 1, auch bei Single-User-Betrieb

## Status
Accepted — 2026-05-11

## Kontext
Die Anwendung ist initial für genau einen Nutzer (den Entwickler selbst). Die Vision sieht jedoch perspektivisch mehrere Nutzer vor, und ein Kernprinzip lautet „Multi-User-fähig von Anfang an" ([architecture.md](../architecture.md), Schicht 2).

Row Level Security (RLS) ist Postgres' eingebauter Mechanismus, um auf Zeilen-Ebene zu erzwingen, welcher User welche Daten sehen oder ändern darf. Supabase Auth integriert sich nahtlos mit RLS über `auth.uid()`.

Erfahrung mit ähnlichen Systemen zeigt: RLS **nachträglich** einzuführen ist sehr schmerzhaft. Bestehende Queries werden durch Policies plötzlich leer, fehlende Policies werden zu kritischen Sicherheitslücken. Die Versuchung, „erstmal ohne, später dann", führt strukturell zu unsicheren Systemen.

## Entscheidung
**Jede Tabelle mit `user_id` hat RLS aktiviert ab dem Moment ihrer Erstellung.** Default-Pattern:

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see only their own events"
  ON events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users insert their own events"
  ON events FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

Für Service-Operationen (z.B. Projektions-Worker, der über alle User aggregiert) wird der **Service-Role-Key** verwendet, der RLS bypasst — explizit, nicht versehentlich.

Lint/CI-Regel oder Konvention: Eine neue Tabelle mit `user_id`-Spalte **ohne RLS gilt als Bug**.

## Konsequenzen
**Positiv:**
- Sicherheitsmodell ist von Tag 1 strukturell korrekt; Multi-User-Erweiterung ist trivial (zusätzliche User → automatisch isoliert).
- Bugs in Anwendungscode, die fremde Daten lesen würden, werden auf DB-Ebene verhindert.
- Mentaler Reflex bei Schema-Design: „Wer darf das sehen?" wird zur Standard-Frage.
- Bei späterem Sharing-Feature (z.B. Trainer/Arzt-Sicht) ist die Erweiterung über zusätzliche Policies klar.

**Negativ:**
- Queries müssen authentifiziert sein, sonst sehen sie nichts — auch in Entwicklung. Lokale Test-Skripte brauchen Service-Role-Key oder Mock-User.
- Policies müssen für jede neue Tabelle geschrieben werden — kein Vergessen erlaubt.
- Debugging „warum sehe ich nichts" wird zur häufigeren Frage; muss durch klare Konventionen entschärft werden.
- Service-Role-Key muss streng gehütet werden; missbraucht umgeht er alle Policies.

## Alternativen
- **RLS später einführen, wenn Multi-User aktiv wird:** Verworfen. Retrofit-Aufwand ist groß; Sicherheitslücken in der Zwischenzeit sind real.
- **Application-Level Access Control statt RLS:** Verworfen. Bugs in App-Code würden Daten leaken; RLS schützt strukturell.
- **Separate Schemata oder DBs pro User:** Verworfen. Skaliert nicht über wenige User hinaus; Backups, Migrations und Analytics werden zur Hölle.
