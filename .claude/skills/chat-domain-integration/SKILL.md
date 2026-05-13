---
name: chat-domain-integration
description: Use when adding a new domain or event type to this Fitness project (e.g. meal_logged, training_logged, sleep_logged, body_measurement), creating a new projection in packages/db, or when explicitly asked to wire an existing domain into the Labor chat assistant. Ensures the new variable becomes visible to the chat by adding a UserContextSection to packages/interpretation. Without this, the chat is blind to the new domain even after events flow into the database.
---

# Chat-Domain-Integration

Wenn eine neue Variable (Mahlzeit, Training, Schlaf, Maße …) im System landet, muss der Chat sie sehen. Sonst ist sie für den Assistenten unsichtbar — egal wie viele Events der Nutzer hat.

## Wann diesen Skill anwenden

- Du legst einen neuen Event-Typ in `packages/core/src/events/<bereich>/<name>.ts` an.
- Du baust eine neue Projektion in `packages/db/src/projections/<name>.ts`.
- Der Nutzer sagt sinngemäß „der Chat soll auch <X> sehen / mitnehmen / berücksichtigen".

## Warum es nötig ist

Der Chat-Endpoint in `apps/web/src/app/api/chat/route.ts` baut seinen System-Prompt mit `buildUserContext()` aus `@fitness/interpretation`. `buildUserContext()` iteriert über eine zentrale `PROVIDERS`-Liste — jeder Provider liefert eine `UserContextSection` für eine Domäne.

**Solange eine Domäne nicht in dieser Liste steht, sieht der Chat sie nicht.** Egal wie sauber die Events, Projektionen und UI dafür gebaut sind.

## Schritte

### 1. Provider-Funktion anlegen

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

  // 1) Wenn keine Daten: ehrlich sagen, nicht raten (Prinzip 7).
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

### 2. In die Registry eintragen

Datei: `packages/interpretation/src/context/build.ts`

```ts
import { get<Domain>Context } from './sections/<domain>';

const PROVIDERS: UserContextProvider[] = [
  getWeightContext,
  get<Domain>Context, // ← hier
];
```

Die Reihenfolge in `PROVIDERS` bestimmt die Reihenfolge im gerenderten System-Prompt.

### 3. Verifizieren

- `pnpm typecheck` — muss grün
- `pnpm lint` — muss grün
- `pnpm test` — muss grün
- Wenn lokale ENV-Vars vorhanden sind: kurz `pnpm dev` starten und im Chat eine Frage stellen, die die neue Domäne berührt — der Assistent muss sich erkennbar darauf beziehen statt allgemein zu antworten.

## Stil-Konventionen für `summary`

Diese Konventionen folgen direkt aus [docs/principles.md](../../../docs/principles.md):

- **Trend vor Einzelwert** (Prinzip 3). Wenn nur ein einzelner Tageswert vorliegt, sag das offen — bastle keine Pseudo-Aussage.
- **Knapp**: 3–6 Zeilen pro Domäne reichen. Der System-Prompt darf nicht zur Geschichte werden — sonst leidet Latenz und Qualität.
- **Mit Datenbasis**: „Datenbasis: N Einträge, ältester am …" — der Chat muss die Reichweite kennen, um Konfidenz aussprechen zu können (Prinzip 7).
- **Deutsche Formatierung**: Komma als Dezimaltrennzeichen, Datum als `dd.mm.yyyy`.
- **`available: false`**: ein Satz reicht. Der Chat erkennt daran, dass er nichts erfinden soll.
- **Keine Geheimnisse / PII / Rohtexte** im summary — nur aggregierte Werte. `raw_input`-Texte gehören nicht in den Prompt.

## Was NICHT zu diesem Skill gehört

- **Tool-Use / Function-Calls** (z.B. `log_meal`-Tool im Chat). Das ist Schritt 2 der Chat-Erweiterung, ein eigener Workflow.
- **Schema-Migrationen / RLS-Policies** (siehe [ADR-0008](../../../docs/decisions/0008-drizzle-migrations.md), [ADR-0009](../../../docs/decisions/0009-rls-ab-tag-1.md)).
- **UI-Komponenten** für die neue Domäne. Der Chat braucht keine UI-Änderung, sobald die Section in der Registry steht.

## Anti-Muster

- **Sektion direkt in den Chat-Endpoint einbauen** statt über `packages/interpretation` — bricht das Pattern und macht den Endpoint zur Sammelstelle aller Domänen.
- **Rohe Event-Listen ausgeben** statt aggregierter Trends — verletzt Prinzip 3 (Trend statt Tageswert) und sprengt das Token-Budget.
- **Erfundene Defaults**, wenn keine Daten vorliegen (z.B. „typisches Gewicht ist 80 kg") — verletzt Prinzip 7 (wissenschaftliche Ehrlichkeit).
