import { serverEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { type UserContent, generateObject } from 'ai';
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

Prinzipien:
- Wissenschaftlich nüchtern. Keine Fake-Präzision: lieber Range im Hinweis als gerundete Einzelzahl ohne Basis.
- Komponenten zerlegen statt pauschal raten. "Bowl mit Hähnchen, Reis, Avocado" → drei items, nicht ein item "Bowl".
- Mengen vorsichtig schätzen. Standard-Portionen als Anker: gekochter Reis ~150g Beilage, Hähnchenbrust ~120g, Avocado halb ~70g.
- Wenn eine Verpackung sichtbar ist und Nährwerte lesbar — nutze sie. Bei mehreren Items mit Verpackung: jede Komponente separat.
- Detail-Nährwerte (sugar_g, fiber_g, saturated_fat_g, salt_g): null wenn nicht abschätzbar. Nicht raten.
- Konfidenz ehrlich. Foto unscharf, Portionsgröße unklar, ungewöhnliches Gericht → niedrig.

Refinement-Modus:
Wenn previous_result + chat_message vorhanden, ist das eine Verfeinerung: nimm previous_result als Ausgangspunkt und passe basierend auf der chat_message an. Behalte items, die der Nutzer nicht anspricht, unverändert. Aktualisiere totals konsistent zu items.

Sprache: Deutsch. Werte immer in Gramm bzw. Kilokalorien.`;

const requestSchema = z.object({
  images: z.array(z.string()).min(0).max(3),
  previous_result: recognizedMealSchema.optional(),
  chat_message: z.string().min(1).max(2000).optional(),
});

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
    const { images, previous_result, chat_message } = parsed.data;

    if (images.length === 0 && !chat_message) {
      return new Response(
        JSON.stringify({ error: 'Mindestens ein Bild oder eine Beschreibung nötig' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const userContent: UserContent = [];

    if (previous_result) {
      userContent.push({
        type: 'text',
        text: `Aktueller Vorschlag (zum Verfeinern):\n${JSON.stringify(previous_result, null, 2)}`,
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

    const { object } = await generateObject({
      model: langdock('claude-sonnet-4-6-default'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
      schema: recognizedMealSchema,
    });

    return new Response(JSON.stringify({ result: object }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
