import { wrapApiHandler } from '@/lib/api/handler';
import { stripJsonFences } from '@/lib/api/llm-json';
import { jsonResponse } from '@/lib/api/response';
import { serverEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { type UserContent, generateText } from 'ai';
import { z } from 'zod';

// Extrahiert Naehrwerte aus einem Foto der Naehrwert-Tabelle einer Verpackung.
// Output: pro 100 g normalisiert (auch wenn die Tabelle Portionen angibt), plus
// optionales Label/Marke und Portionsgroesse. Wird vom PantrySheet aufgerufen,
// um neue Vorrat-Eintraege ohne manuelles Abtippen anzulegen — Werte landen
// als Prefill im CreateSheet, der User bestaetigt vor dem Speichern.
//
// Langdock-Proxy zu Anthropic, server-only API-Key. Bewusst kein Schreib-Zugriff
// auf pantry_items hier — der Endpoint ist nur Extraktor, das eigentliche
// Anlegen passiert ueber /api/pantry POST nach User-Bestaetigung.
export const runtime = 'nodejs';
export const maxDuration = 45;

const nutritionLabelSchema = z.object({
  label: z
    .string()
    .max(200)
    .nullable()
    .describe(
      'Produktname, falls eindeutig erkennbar (z.B. "Skyr Vanille", "Basmati-Reis"). null wenn nicht klar lesbar oder nur die Naehrwert-Tabelle sichtbar.',
    ),
  brand: z.string().max(120).nullable().describe('Hersteller/Marke, falls erkennbar. Sonst null.'),
  serving_size_g: z
    .number()
    .min(0)
    .max(5000)
    .nullable()
    .describe('Empfohlene Portionsgroesse in Gramm, falls in der Tabelle angegeben. Sonst null.'),
  kcal_per_100g: z.number().min(0).max(2000).nullable(),
  protein_g_per_100g: z.number().min(0).max(200).nullable(),
  carbs_g_per_100g: z.number().min(0).max(200).nullable(),
  fat_g_per_100g: z.number().min(0).max(200).nullable(),
  sugar_g_per_100g: z.number().min(0).max(200).nullable(),
  fiber_g_per_100g: z.number().min(0).max(200).nullable(),
  saturated_fat_g_per_100g: z.number().min(0).max(200).nullable(),
  salt_g_per_100g: z.number().min(0).max(100).nullable(),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Konfidenz in die extrahierten Werte (0–1). >0.8 nur, wenn Tabelle scharf, vollstaendig und eindeutig zu lesen. <0.5 bei unscharfen oder teilweise verdeckten Tabellen.',
    ),
  hint: z
    .string()
    .max(200)
    .nullable()
    .describe(
      'Ein Satz, was unsicher war oder fehlt, z.B. "Zucker und Ballaststoffe nicht lesbar" oder null.',
    ),
});

export type NutritionLabelResult = z.infer<typeof nutritionLabelSchema>;

const SYSTEM_PROMPT = `Du extrahierst Naehrwerte aus einem Foto einer Naehrwert-Tabelle (Produktverpackung).

Aufgabe:
- Lese die Naehrwert-Tabelle und gib die Werte **pro 100 g** zurueck.
- Wenn die Tabelle nur Werte "pro Portion" angibt (z.B. "pro 30 g Portion"), rechne auf 100 g um (Faktor 100/Portion).
- Wenn beide Spalten existieren (pro 100 g und pro Portion), nimm die 100-g-Spalte.
- Wenn ein Wert nicht lesbar oder nicht angegeben ist: null. Niemals raten.
- Produktname/Marke nur uebernehmen, wenn klar lesbar (z.B. auf dem Etikett oder am Rand). Wenn nur die Tabelle sichtbar ist und kein eindeutiger Produktname auftaucht: label und brand auf null.
- Portionsgroesse (serving_size_g): wenn die Tabelle eine Portionsgroesse angibt, in Gramm zurueckgeben. Sonst null.
- Konfidenz ehrlich. Unscharf, teilweise verdeckt, ungewoehnliches Layout → niedrig.

Output-Format (zwingend):
Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt, ohne Markdown-Fences, ohne Vor- oder Nachtext. Keine Tool-Calls.

{
  "label": "string|null (max 200 Zeichen)",
  "brand": "string|null (max 120 Zeichen)",
  "serving_size_g": number|null,
  "kcal_per_100g": number|null,
  "protein_g_per_100g": number|null,
  "carbs_g_per_100g": number|null,
  "fat_g_per_100g": number|null,
  "sugar_g_per_100g": number|null,
  "fiber_g_per_100g": number|null,
  "saturated_fat_g_per_100g": number|null,
  "salt_g_per_100g": number|null,
  "confidence": number (0..1),
  "hint": "string|null (max 200 Zeichen)"
}`;

const requestSchema = z.object({
  image: z.string().min(1),
});

export const POST = wrapApiHandler('extract-nutrition-label', async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: 'Nicht angemeldet' }, 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'Ungueltiger JSON-Body' }, 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: 'Ungueltige Eingabe', issues: parsed.error.issues }, 400);
  }

  const userContent: UserContent = [
    { type: 'image', image: parsed.data.image },
    {
      type: 'text',
      text: 'Extrahiere die Naehrwerte aus dieser Tabelle und liefere das JSON-Objekt.',
    },
  ];

  const { LANGDOCK_API_KEY } = serverEnv();
  const langdock = createAnthropic({
    baseURL: 'https://api.langdock.com/anthropic/eu/v1',
    apiKey: LANGDOCK_API_KEY,
  });

  const { text, finishReason, usage } = await generateText({
    model: langdock('claude-sonnet-4-6-default'),
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
    maxOutputTokens: 1200,
  });

  const cleaned = stripJsonFences(text);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (jsonErr) {
    console.error('extract-nutrition-label: JSON-Parse fehlgeschlagen', {
      finishReason,
      usage,
      rawTextHead: text.slice(0, 600),
      parseError: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
    });
    return jsonResponse(
      {
        error:
          'KI-Antwort war kein gueltiges JSON. Versuch es nochmal oder gib die Werte manuell ein.',
      },
      502,
    );
  }

  const schemaParsed = nutritionLabelSchema.safeParse(parsedJson);
  if (!schemaParsed.success) {
    console.error('extract-nutrition-label: Schema-Validation fehlgeschlagen', {
      finishReason,
      usage,
      issues: schemaParsed.error.issues.slice(0, 8),
    });
    return jsonResponse(
      {
        error: 'KI-Antwort entsprach nicht dem erwarteten Schema. Versuch es nochmal.',
      },
      502,
    );
  }

  return jsonResponse({ result: schemaParsed.data });
});
