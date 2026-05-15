import { serverEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { type UserContent, generateText } from 'ai';
import { z } from 'zod';

// Vision-Erkennung von Mahlzeiten: Foto(s) + optionaler Refinement-Chat in,
// strukturierter Vorschlag raus. Langdock-Proxy zu Anthropic, server-only API-Key.
export const runtime = 'nodejs';
export const maxDuration = 60;

const recognizedMealItemSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(120)
    .describe('Kurzname der Komponente, z.B. "Basmati-Reis", "Hähnchenbrust gegrillt".'),
  amount_g: z
    .number()
    .min(0)
    .max(10000)
    .nullable()
    .describe('Geschätzte Menge in Gramm. null wenn unmöglich abzuschätzen.'),
  kcal: z.number().min(0).max(10000).nullable(),
  protein_g: z.number().min(0).max(1000).nullable(),
  carbs_g: z.number().min(0).max(1000).nullable(),
  fat_g: z.number().min(0).max(1000).nullable(),
  // Wenn dieses Item klar einem Pantry-Eintrag des Nutzers entspricht, gibt
  // das LLM die ID + Match-Konfidenz zurück. Die UI zeigt eine Bestätigungs-
  // Pille — erst nach „Ja" werden die exakten Pantry-Nährwerte übernommen.
  // KEINE uuid()-Validierung: Halluzinationen werden serverseitig gegen die
  // Whitelist gefiltert.
  suggested_pantry_id: z
    .string()
    .nullable()
    .describe(
      'UUID eines Pantry-Eintrags aus pantry[], wenn das Item klar diesem Produkt entspricht. Sonst null.',
    ),
  match_confidence: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe(
      'Konfidenz für den Pantry-Match (0–1). Nur setzen, wenn suggested_pantry_id gesetzt ist. >=0.7 für sichere Matches.',
    ),
});

const recognizedMealSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(200)
    .describe('Aussagekräftiger Gesamt-Name der Mahlzeit, z.B. "Hähnchen-Reis-Bowl mit Avocado".'),
  items: z
    .array(recognizedMealItemSchema)
    .min(1)
    .max(15)
    .describe(
      'Komponenten der Mahlzeit getrennt aufgeführt. Mindestens eine. Bei einfachen Gerichten kann das auch nur ein Item sein. Aggregierte Items wie "Salat" oder "Beilagen" vermeiden — lieber spezifisch.',
    ),
  totals: z.object({
    kcal: z.number().min(0).max(20000),
    protein_g: z.number().min(0).max(2000).nullable(),
    carbs_g: z.number().min(0).max(2000).nullable(),
    fat_g: z.number().min(0).max(2000).nullable(),
    sugar_g: z.number().min(0).max(2000).nullable(),
    fiber_g: z.number().min(0).max(2000).nullable(),
    saturated_fat_g: z.number().min(0).max(2000).nullable(),
    salt_g: z.number().min(0).max(200).nullable(),
  }),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Deine Konfidenz in die Gesamt-Schätzung (0–1). >0.8 nur wenn Mengen und Komponenten klar erkennbar sind. <0.5 bei vagen oder mehrdeutigen Aufnahmen.',
    ),
  hint: z
    .string()
    .max(200)
    .nullable()
    .describe(
      'Optional: ein Satz, was unsicher ist und wo der Nutzer im Chat verfeinern kann, z.B. "Reis-Menge unklar — bestätige bitte" oder null.',
    ),
  // Wenn eine User-Vorlage klar zur erkannten Mahlzeit passt, gibt das LLM
  // die ID + Begründung zurück. Die UI zeigt dann einen "Sieht aus wie deine
  // X — direkt loggen?"-Banner. null = kein Match (oder keine Templates).
  // Bewusst KEINE uuid()-Validierung: das Modell halluziniert gelegentlich
  // leere Strings oder Pseudo-IDs. Wir filtern unten gegen die Whitelist und
  // verwerfen alles, was nicht in templates[] stand.
  suggested_template_id: z
    .string()
    .nullable()
    .describe(
      'UUID einer User-Vorlage aus user_templates, wenn die erkannte Mahlzeit klar einer Vorlage entspricht. Nur setzen, wenn Label, Komponenten und kcal-Range gut passen (Konfidenz für das Match selbst >=0.7). Sonst null.',
    ),
  suggested_template_reason: z
    .string()
    .max(160)
    .nullable()
    .describe(
      'Ein kurzer Satz, warum die Vorlage passt, z.B. "Komponenten Skyr, Beeren und Granola identisch". null wenn suggested_template_id null ist.',
    ),
});

export type RecognizedMeal = z.infer<typeof recognizedMealSchema>;

const SYSTEM_PROMPT = `Du bist die Mahlzeit-Erkennung von Labor — einem wissenschaftlichen Ernährungs-Assistenten.

Aufgabe:
Aus 1–3 Fotos einer Mahlzeit (Teller, Verpackung, Komponenten) extrahierst du:
1. Einen aussagekräftigen Gesamt-Namen.
2. Die einzelnen Komponenten als items[] — getrennt aufgeführt, mit Mengen-Schätzung.
3. Tages-Nährwerte aggregiert (kcal Pflicht, Makros und Detail-Nährwerte optional).
4. Deine Konfidenz zur Gesamt-Schätzung.
5. Optional einen Hinweis, was unsicher ist.
6. Optional: ein Match zu einer existierenden User-Vorlage (suggested_template_id).

Prinzipien:
- Wissenschaftlich nüchtern. Keine Fake-Präzision: lieber Range im Hinweis als gerundete Einzelzahl ohne Basis.
- Komponenten zerlegen statt pauschal raten. "Bowl mit Hähnchen, Reis, Avocado" → drei items, nicht ein item "Bowl".
- Mengen vorsichtig schätzen. Standard-Portionen als Anker: gekochter Reis ~150g Beilage, Hähnchenbrust ~120g, Avocado halb ~70g.
- Wenn eine Verpackung sichtbar ist und Nährwerte lesbar — nutze sie. Bei mehreren Items mit Verpackung: jede Komponente separat.
- Detail-Nährwerte (sugar_g, fiber_g, saturated_fat_g, salt_g): null wenn nicht abschätzbar. Nicht raten.
- Konfidenz ehrlich. Foto unscharf, Portionsgröße unklar, ungewöhnliches Gericht → niedrig.

Template-Match (Food Memory):
Wenn der User dir eine Liste seiner gespeicherten Vorlagen mitgibt (templates), prüfe nach der Bild-Analyse, ob die erkannte Mahlzeit zu einer Vorlage passt:
- Passt das Label oder die Komponenten klar zu einer Vorlage? (z.B. "Skyr mit Beeren" ↔ Vorlage "Standard-Frühstück Skyr-Bowl")
- Liegt deine erkannte kcal-Schätzung in einer plausiblen Range der Vorlagen-kcal (±25%)?
- Sind die Haupt-Komponenten gleich?
Nur wenn ALLE drei Punkte zutreffen: gib suggested_template_id zurück und schreibe in suggested_template_reason kurz warum. Sonst null. Lieber konservativ — falsche Matches frustrieren den User mehr als ausbleibende.

Pantry-Match (Zutaten-Bibliothek):
Wenn der User dir eine Liste seiner gespeicherten Pantry-Items mitgibt (pantry — z.B. eingescannte Markenprodukte mit Label, Brand, kcal/100g), prüfe pro item[] separat, ob die Komponente klar einem Pantry-Eintrag entspricht:
- Markenprodukt im Bild sichtbar? (Verpackung lesbar, Logo erkennbar)
- Label-/Brand-Übereinstimmung deutlich? (nicht nur Produktkategorie wie „Müsli", sondern „Kölln Schoko-Müsli")
- kcal-Range deiner Komponente plausibel zu kcal/100g × geschätzter Menge?
Wenn ja: setze suggested_pantry_id auf die ID des passenden Pantry-Eintrags und match_confidence auf deine Konfidenz (0..1). Sonst beide null. NIE raten — Pantry-Matches lösen exakte Nährwerte aus, falsche Matches verfälschen die Bilanz schlimmer als unsichere Schätzungen.

Refinement-Modus:
Wenn previous_result + chat_message vorhanden, ist das eine Verfeinerung: nimm previous_result als Ausgangspunkt und passe basierend auf der chat_message an. Behalte items, die der Nutzer nicht anspricht, unverändert. Aktualisiere totals konsistent zu items. Template-Match nicht erneut prüfen — übernimm den Wert aus previous_result.

Sprache: Deutsch. Werte immer in Gramm bzw. Kilokalorien.

OUTPUT-FORMAT (zwingend):
Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt, ohne Markdown-Fences, ohne erklärenden Vor- oder Nachtext. Keine Tool-Calls. Halte dich exakt an dieses Schema:

{
  "label": "string (1-200 Zeichen)",
  "items": [
    {
      "label": "string (1-120 Zeichen)",
      "amount_g": number|null,
      "kcal": number|null,
      "protein_g": number|null,
      "carbs_g": number|null,
      "fat_g": number|null,
      "suggested_pantry_id": "string|null (UUID aus pantry[])",
      "match_confidence": number|null (0..1, nur wenn suggested_pantry_id gesetzt)
    }
  ],
  "totals": {
    "kcal": number,
    "protein_g": number|null,
    "carbs_g": number|null,
    "fat_g": number|null,
    "sugar_g": number|null,
    "fiber_g": number|null,
    "saturated_fat_g": number|null,
    "salt_g": number|null
  },
  "confidence": number (0..1),
  "hint": "string|null (max 200 Zeichen)",
  "suggested_template_id": "string|null (UUID einer mitgegebenen Vorlage)",
  "suggested_template_reason": "string|null (max 160 Zeichen)"
}

items[] enthält mindestens ein Element, höchstens 15. Wenn ein Wert unbekannt ist, schreibe null — niemals Strings wie "unbekannt" oder leere Strings.`;

// Knapp-Repräsentation der User-Templates, die wir dem LLM zum Matching mitgeben.
// Bewusst nur Label + kcal + Hauptmakros + Slot, keine PII oder Detail-Nährwerte —
// reicht zum Match-Vergleich, hält den Prompt schlank.
const templateRefSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  kcal: z.number(),
  protein_g: z.number().nullable(),
  carbs_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable(),
});

const requestSchema = z.object({
  images: z.array(z.string()).min(0).max(3),
  previous_result: recognizedMealSchema.optional(),
  chat_message: z.string().min(1).max(2000).optional(),
  templates: z.array(templateRefSchema).max(100).optional(),
});

const PANTRY_CONTEXT_LIMIT = 30;

interface PantryContextEntry {
  id: string;
  label: string;
  brand: string | null;
  kcal_per_100g: number | null;
  protein_g_per_100g: number | null;
  carbs_g_per_100g: number | null;
  fat_g_per_100g: number | null;
  sugar_g_per_100g: number | null;
  fiber_g_per_100g: number | null;
  saturated_fat_g_per_100g: number | null;
  salt_g_per_100g: number | null;
  serving_size_g: number | null;
}

// Was im Recognize-Response unter `pantry` rauskommt: nur die referenzierten
// Items mit vollen Nährwerten, damit das Frontend die Übernahme exakt rechnen
// kann. Top-Type, damit das Frontend ihn ohne Server-Import nutzen kann.
export type RecognizedPantryEntry = PantryContextEntry;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Nicht angemeldet' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Ungültiger Request', issues: parsed.error.issues }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
    const { images, previous_result, chat_message, templates } = parsed.data;

    if (images.length === 0 && !chat_message) {
      return new Response(
        JSON.stringify({ error: 'Mindestens ein Bild oder eine Beschreibung nötig' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Pantry-Items des Nutzers laden (Top-N aktive nach Last-Used).
    // RLS filtert User automatisch.
    let pantryContext: PantryContextEntry[] = [];
    if (!previous_result) {
      const pantryQuery = await supabase
        .from('pantry_items')
        .select(
          'id, label, brand, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugar_g_per_100g, fiber_g_per_100g, saturated_fat_g_per_100g, salt_g_per_100g, serving_size_g',
        )
        .eq('is_archived', false)
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .limit(PANTRY_CONTEXT_LIMIT);
      pantryContext = (pantryQuery.data ?? []) as PantryContextEntry[];
    }

    const userContent: UserContent = [];

    if (previous_result) {
      userContent.push({
        type: 'text',
        text: `Aktueller Vorschlag (zum Verfeinern):\n${JSON.stringify(previous_result, null, 2)}`,
      });
    }

    if (templates && templates.length > 0 && !previous_result) {
      userContent.push({
        type: 'text',
        text: `Gespeicherte Vorlagen des Nutzers (zum Matching):\n${JSON.stringify(templates, null, 2)}`,
      });
    }

    if (pantryContext.length > 0) {
      // Schlanker Pantry-View für den LLM-Prompt — Detail-Nährwerte braucht das
      // Modell für den Match nicht, würde nur Tokens kosten.
      const pantryForPrompt = pantryContext.map((p) => ({
        id: p.id,
        label: p.label,
        brand: p.brand,
        kcal_per_100g: p.kcal_per_100g,
        serving_size_g: p.serving_size_g,
      }));
      userContent.push({
        type: 'text',
        text: `Pantry-Bibliothek des Nutzers (zum Matching pro item[]):\n${JSON.stringify(pantryForPrompt, null, 2)}`,
      });
    }

    for (const dataUrl of images) {
      userContent.push({ type: 'image', image: dataUrl });
    }

    if (chat_message) {
      userContent.push({
        type: 'text',
        text: previous_result
          ? `Anpassung vom Nutzer: ${chat_message}`
          : `Zusätzlicher Kontext vom Nutzer: ${chat_message}`,
      });
    } else if (images.length > 0 && !previous_result) {
      userContent.push({
        type: 'text',
        text: 'Analysiere die Mahlzeit auf den Bildern und liefere den strukturierten Vorschlag.',
      });
    }

    const { LANGDOCK_API_KEY } = serverEnv();
    const langdock = createAnthropic({
      baseURL: 'https://api.langdock.com/anthropic/eu/v1',
      apiKey: LANGDOCK_API_KEY,
    });

    // Wir benutzen bewusst generateText statt generateObject:
    // Langdock-Proxy reicht das tools-Param fuer Anthropic-strukturierte-Outputs
    // nicht zuverlaessig durch — Folge war wiederholt NoObjectGeneratedError mit
    // abgeschnittenem oder leerem Output. Mit Text-Mode + System-Prompt-JSON-Vertrag
    // bekommen wir den Rohtext, koennen Markdown-Fences strippen und sehen bei
    // Fehlern in den Logs exakt, was das Modell geliefert hat.
    const { text, finishReason, usage } = await generateText({
      model: langdock('claude-sonnet-4-6-default'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
      maxOutputTokens: 4096,
    });

    const cleaned = stripJsonFences(text);
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (jsonErr) {
      console.error('recognize-meal: JSON-Parse fehlgeschlagen', {
        finishReason,
        usage,
        rawTextHead: text.slice(0, 800),
        rawTextTail: text.slice(-400),
        parseError: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
      });
      return new Response(
        JSON.stringify({
          error:
            'KI-Antwort war kein gueltiges JSON. Versuch es nochmal oder beschreib die Mahlzeit im Chat.',
        }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      );
    }

    const schemaParsed = recognizedMealSchema.safeParse(parsedJson);
    if (!schemaParsed.success) {
      console.error('recognize-meal: Schema-Validation fehlgeschlagen', {
        finishReason,
        usage,
        issues: schemaParsed.error.issues.slice(0, 8),
        rawJsonHead: cleaned.slice(0, 600),
      });
      return new Response(
        JSON.stringify({
          error: 'KI-Antwort entsprach nicht dem erwarteten Schema. Versuch es nochmal.',
        }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      );
    }
    const object = schemaParsed.data;

    // Defensive: das LLM kann eine Template-ID halluzinieren oder leeren String
    // statt null liefern. Nur durchlassen, wenn die ID in der mitgegebenen
    // templates-Liste war (oder beim Refinement in previous_result stand).
    const allowedIds = new Set<string>();
    if (templates) for (const t of templates) allowedIds.add(t.id);
    if (previous_result?.suggested_template_id)
      allowedIds.add(previous_result.suggested_template_id);
    const rawId = object.suggested_template_id;
    const idValid = rawId !== null && rawId.length > 0 && allowedIds.has(rawId);

    // Pantry-IDs analog whitelisten. Bei Refinement vom Vorgänger übernehmen,
    // damit der User-Confirmierte Pantry-Vorschlag nicht durch eine neue Runde
    // gelöscht wird.
    const allowedPantryIds = new Set<string>();
    for (const p of pantryContext) allowedPantryIds.add(p.id);
    if (previous_result) {
      for (const it of previous_result.items) {
        if (it.suggested_pantry_id) allowedPantryIds.add(it.suggested_pantry_id);
      }
    }
    const validatedItems = object.items.map((it) => {
      const rawPantry = it.suggested_pantry_id;
      const pantryValid =
        typeof rawPantry === 'string' && rawPantry.length > 0 && allowedPantryIds.has(rawPantry);
      return {
        ...it,
        suggested_pantry_id: pantryValid ? rawPantry : null,
        match_confidence: pantryValid ? it.match_confidence : null,
      };
    });

    const validated: RecognizedMeal = {
      ...object,
      items: validatedItems,
      suggested_template_id: idValid ? rawId : null,
      suggested_template_reason: idValid ? object.suggested_template_reason : null,
    };

    // Pantry-Daten, die im Result referenziert werden, mit zurückschicken —
    // das Frontend braucht Label/Marke/Nährwerte/Portion für die
    // Bestätigungs-Pille und das Übernehmen der exakten Werte.
    const usedPantryIds = new Set<string>();
    for (const it of validated.items) {
      if (it.suggested_pantry_id) usedPantryIds.add(it.suggested_pantry_id);
    }
    const usedPantry: PantryContextEntry[] = pantryContext.filter((p) => usedPantryIds.has(p.id));

    return new Response(JSON.stringify({ result: validated, pantry: usedPantry }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('recognize-meal: unexpected', err);
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

// LLMs verpacken JSON gerne in ```json ... ``` oder ``` ... ``` trotz expliziter
// Anweisung. Strippt fuehrende/nachfolgende Fences und Whitespace, damit
// JSON.parse direkt damit klarkommt.
function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  // Fallback: erstes { bis letztes } extrahieren — robust gegen Vor-/Nachgeschwafel
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}
