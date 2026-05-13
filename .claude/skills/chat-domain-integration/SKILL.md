---
name: chat-domain-integration
description: Use when adding a new domain or event type to this Fitness project (e.g. meal_logged, training_logged, sleep_logged, body_measurement), creating a new projection in packages/db, adding a new ingestion command, or when explicitly asked to wire an existing domain into the Labor chat assistant. Ensures the new variable is both READABLE (UserContextSection) and WRITABLE (ChatToolset) by the chat. Without this, the chat is blind to the new domain — even after events flow into the database — or cannot help the user log into it.
---

# Chat-Domain-Integration

Wenn eine neue Variable (Mahlzeit, Training, Schlaf, Maße …) im System landet, muss der Chat sie **sehen** (Read) **und** **eintragen können** (Write). Beides hat ein eigenes Pattern in `packages/interpretation`. Solange du nur eines anschließt, ist die Domäne im Chat halbgebacken.

## Wann diesen Skill anwenden

- Du legst einen neuen Event-Typ in `packages/core/src/events/<bereich>/<name>.ts` an.
- Du baust eine neue Projektion in `packages/db/src/projections/<name>.ts`.
- Du fügst einen neuen Ingestion-Command in `packages/ingestion/src/commands/` hinzu (z.B. `logMeal`).
- Der Nutzer sagt sinngemäß „der Chat soll auch <X> sehen / mitnehmen / eintragen können".

## Warum es nötig ist

Der Chat-Endpoint in `apps/web/src/app/api/chat/route.ts` baut zwei Dinge aus `@fitness/interpretation`:

1. **Lesen — UserContext:** `buildUserContext()` iteriert über eine `PROVIDERS`-Liste — jeder Provider liefert eine `UserContextSection` für eine Domäne. Wird in den System-Prompt gerendert.
2. **Schreiben — ChatTools:** `buildChatTools()` iteriert über eine `TOOLSETS`-Liste — jedes Set liefert AI-SDK-Tools (z.B. `log_weight`, `correct_weight`, `retract_weight`). Der Chat ruft sie via Function-Calling auf.

**Solange eine Domäne nicht in beiden Listen steht, ist sie für den Chat halb unsichtbar.** Egal wie sauber die Events, Projektionen und UI dafür gebaut sind.

## Schritte — Teil 0: PROJEKTION (packages/db/src/projections/<name>.ts)

Wenn die Projektion noch nicht existiert, baue sie **zuerst** — Context (Teil A) und Tools (Teil B) hängen daran. Replay-Pattern, Sortier-Regel und Korrektur-Logik sind in [ADR-0010](../../../docs/decisions/0010-projektionen-replay-pattern.md) festgehalten — vor dem Coden lesen, nicht hier wiederholen. Vorlage kopieren und anpassen:

- **Single-Field** (ein Wert wird korrigiert): [weight.ts](../../../packages/db/src/projections/weight.ts) + [weight.test.ts](../../../packages/db/src/projections/weight.test.ts)
- **Multi-Field** (partielle Korrekturen): [meal.ts](../../../packages/db/src/projections/meal.ts) + [meal.test.ts](../../../packages/db/src/projections/meal.test.ts)

Pflicht-Test-Szenarien (sonst regrediert das Pattern):
Tagestotals/Trends bei Normalfall · Korrektur bei **unsortiertem** Input · Korrekturkette · Retract-of-Correction (Fallback) · Retract des Domain-Events.

## Schritte — Teil A: LESEN (UserContextSection)

### A1. Provider-Funktion anlegen

Datei: `packages/interpretation/src/context/sections/<domain>.ts`

```ts
import { get<Domain>Projection } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContextSection } from '../types';

function formatNumber(n: number, unit: string): string {
  return `${n.toFixed(2).replace('.', ',')} ${unit}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export async function get<Domain>Context(
  client: SupabaseClient,
  userId: string,
): Promise<UserContextSection> {
  const projection = await get<Domain>Projection(client, userId);

  // 1) Wenn keine Daten: ehrlich sagen, nicht raten (CLAUDE.md Disziplin 4).
  if (/* Empty-Check passend zur Projektion */) {
    return {
      domain: '<bereich>.<name>', // z.B. 'nutrition.meals', 'training.sessions'
      label: '<deutscher Anzeigename>',
      available: false,
      summary: 'Noch keine <Anzeigename>-Einträge.',
    };
  }

  // 2) Bei vorhandenen Daten: trend-orientiert, knapp, mit Datenbasis.
  const lines: string[] = [];
  // - Trend / Bewegungsdurchschnitt
  // - Letzter Eintrag (Datum, Wert)
  // - Datenbasis: N Einträge, ältester am ...

  return {
    domain: '<bereich>.<name>',
    label: '<deutscher Anzeigename>',
    available: true,
    summary: lines.join('\n'),
  };
}
```

Vorlage: [packages/interpretation/src/context/sections/weight.ts](../../../packages/interpretation/src/context/sections/weight.ts).

### A2. In die Context-Registry eintragen

Datei: `packages/interpretation/src/context/build.ts`

```ts
import { get<Domain>Context } from './sections/<domain>';

const PROVIDERS: UserContextProvider[] = [
  getWeightContext,
  get<Domain>Context, // ← hier
];
```

Die Reihenfolge in `PROVIDERS` bestimmt die Reihenfolge im gerenderten System-Prompt.

## Schritte — Teil B: SCHREIBEN (ChatToolset)

Nur nötig, wenn der Nutzer per Chat in diese Domäne eintragen / korrigieren / zurückziehen können soll. Reine Beobachtungs-Domänen (z.B. „Wearable-Sync-Status") brauchen das nicht.

### B1. Tool-Set anlegen

Datei: `packages/interpretation/src/tools/sets/<domain>.ts`

**Regel: Jedes Tool, das in die Datenbank schreibt, muss `needsApproval: true` haben.** Der Nutzer bestätigt jeden Schreibvorgang in der UI. Tools, die nur lesen (z.B. `list_recent_*`), brauchen kein Approval.

```ts
import { log<Domain>, correct<Domain>, retract<Domain> } from '@fitness/ingestion';
import { tool } from 'ai';
import { z } from 'zod';
import type { ChatToolset } from '../types';

export const <domain>Tools: ChatToolset = ({ client, userId }) => ({
  log_<domain>: tool({
    description:
      'Trage ein <Domain>-Event ein. Verwende dies, wenn der Nutzer ... Der Nutzer bestätigt den Eintrag über die UI bevor er geschrieben wird.',
    inputSchema: z.object({
      /* Domain-spezifische Felder, mit .describe() pro Feld */
      confidence: z.number().min(0).max(1).describe('Deine Konfidenz, dass die Extraktion korrekt war (0-1).'),
    }),
    needsApproval: true, // ← Pflicht für jeden DB-Schreibvorgang
    execute: async (input) => {
      const result = await log<Domain>(client, {
        user_id: userId,
        /* Felder */
        source: 'ai-extracted',
        confidence: input.confidence,
      });
      return { ok: true, event_id: result.event_id, /* relevante Echos */ };
    },
  }),

  // Lese-Tool ohne needsApproval — wird für correct/retract gebraucht,
  // damit der LLM die richtige event_id findet.
  list_recent_<domain>_entries: tool({ /* ... ohne needsApproval ... */ }),
});
```

Vorlage: [packages/interpretation/src/tools/sets/weight.ts](../../../packages/interpretation/src/tools/sets/weight.ts).

### B2. In die Tools-Registry eintragen

Datei: `packages/interpretation/src/tools/build.ts`

```ts
import { <domain>Tools } from './sets/<domain>';

const TOOLSETS: ChatToolset[] = [weightTools, <domain>Tools];
```

**Tool-Namen müssen über alle Sets hinweg eindeutig sein** — also `log_meal` nicht `log`, `log_training` nicht `log_session`.

### B3. UI-Anzeige für die neuen Tool-Namen

Datei: `apps/web/src/components/Chat.tsx`.

**Drei Stellen pro Schreib-Tool:**

1. `TOOL_LABELS` — Label für die Status-Chip nach erfolgreicher Ausführung:

```ts
const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  log_weight: { running: 'Gewicht speichern…', done: 'Gewicht gespeichert' },
  log_<domain>: { running: '<Anzeigename> speichern…', done: '<Anzeigename> gespeichert' },
};
```

2. `formatToolDetail` — was im Status-Chip neben dem Label steht (z.B. „84,1 kg").

3. `formatApprovalSummary` — was in der Bestätigungs-Karte angezeigt wird, bevor der Nutzer klickt. Dieser Text ist die letzte Verteidigungslinie gegen Fehl-Speicherungen — muss **klar, knapp und verifizierbar** sein. Beispiele:
   - log_meal: „Mittagessen eintragen — Skyr mit Beeren, ca. 420 kcal"
   - log_training: „Training eintragen — Bankdrücken 4×8 @ 80 kg"

Ohne diese Einträge fällt die UI auf den Tool-Namen zurück (z.B. `log_meal ausführen?`) — funktional, aber für den Nutzer kryptisch.

## Verifizieren

- `pnpm typecheck` — muss grün
- `pnpm lint` — muss grün
- `pnpm test` — muss grün
- Wenn lokale ENV-Vars vorhanden sind: kurz `pnpm dev` starten und im Chat eine Frage stellen, die die neue Domäne berührt — der Assistent muss sich erkennbar darauf beziehen statt allgemein zu antworten.

## Stil-Konventionen für `summary`

Folgen direkt aus den CLAUDE.md-Disziplinen 3 (Trend statt Tageswert) und 4 (Unsicherheit aussprechen):

- **Trend vor Einzelwert**. Wenn nur ein einzelner Tageswert vorliegt, sag das offen — bastle keine Pseudo-Aussage.
- **Knapp**: 3–6 Zeilen pro Domäne reichen. Der System-Prompt darf nicht zur Geschichte werden.
- **Mit Datenbasis**: „Datenbasis: N Einträge, ältester am …" — der Chat muss die Reichweite kennen, um Konfidenz aussprechen zu können.
- **Deutsche Formatierung**: Komma als Dezimaltrennzeichen, Datum als `dd.mm.yyyy`.
- **`available: false`**: ein Satz reicht. Der Chat erkennt daran, dass er nichts erfinden soll.
- **Keine Geheimnisse / PII / Rohtexte** — nur aggregierte Werte. `raw_input`-Texte gehören nicht in den Prompt.

## Was NICHT zu diesem Skill gehört

- **Schema-Migrationen / RLS-Policies** (siehe [ADR-0008](../../../docs/decisions/0008-drizzle-migrations.md), [ADR-0009](../../../docs/decisions/0009-rls-ab-tag-1.md)).
- **Volle UI-Tabs** für die neue Domäne (Body-/Nutrition-/Training-Screens). Der Chat funktioniert vollständig ohne neue UI, sobald Context und Tools registriert sind.
- **Event-Schemas und Ingestion-Commands** selbst — die müssen vorher existieren. Dieser Skill schließt sie nur an den Chat an.

## Anti-Muster

- **Replay-Sortierung nach `occurred_at`** statt `recorded_at, id` — Korrekturen mit früherem `occurred_at` als ihr Ziel-Event werden still verschluckt. Siehe [ADR-0010](../../../docs/decisions/0010-projektionen-replay-pattern.md) und die Fixes in #14 / #16.
- **Naiver `byId`-Replay ohne Korrekturketten-Auflösung** — `event_corrected`, das wiederum korrigiert wird, findet sein Ziel nicht und die zweite Korrektur fällt raus. Korrekturen brauchen eine `correctionTargetById`-Indirection.
- **„Letzte Korrektur ersetzt alles" bei Multi-Field-Domänen** — eine spätere kcal-Korrektur überschreibt eine frühere label-Korrektur. Multi-Field-Domains brauchen Field-wise Overlay.
- **Projektion direkt mit Supabase-Client koppeln** ohne reine `project<Domain>Events`-Funktion — verhindert Unit-Tests ohne DB-Mock und brennt das Bug-Risiko aus 0.2/0.3/0.4 in eine ungetestete Stelle ein.
- **Sektion direkt in den Chat-Endpoint einbauen** statt über `packages/interpretation` — bricht das Pattern und macht den Endpoint zur Sammelstelle aller Domänen.
- **Rohe Event-Listen ausgeben** statt aggregierter Trends — verletzt CLAUDE.md Disziplin 3 (Trend statt Tageswert) und sprengt das Token-Budget.
- **Erfundene Defaults**, wenn keine Daten vorliegen (z.B. „typisches Gewicht ist 80 kg") — verletzt CLAUDE.md Disziplin 4 (Unsicherheit aussprechen).
- **Tools, die direkt in `events` schreiben**, statt den Ingestion-Command aus `@fitness/ingestion` aufzurufen — bricht Disziplin „Schreiben nur via Ingestion-Pipeline" (CLAUDE.md).
- **Tool ohne `confidence`-Parameter im inputSchema** für KI-extrahierte Eingaben — verletzt die KI-Provenance-Pflichtfelder ([event-model.md](../../../docs/event-model.md#ki-provenance)).
- **`log_X`-Tool ohne dazugehöriges `list_recent_X_entries`-Tool**, wenn auch Korrektur/Retraction angeboten werden — der LLM hat sonst keine Quelle für die `event_id`.
- **Schreib-Tool ohne `needsApproval: true`** — verletzt die Disziplin „keine stillen DB-Schreibvorgänge". Der Nutzer muss jede Aktion in der UI bestätigen können. Nur Lese-Tools (`list_recent_*`, Aggregations-Lookups) dürfen ohne Approval laufen.
- **Approval-Bestätigung im LLM-Text doppeln** („soll ich speichern?") — die UI macht das. Doppelt nervt und vermittelt dem Nutzer, er sei auf den LLM angewiesen.
