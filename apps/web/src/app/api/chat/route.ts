import { serverEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { buildChatTools, buildUserContext, renderContextForPrompt } from '@fitness/interpretation';
import { type UIMessage, convertToModelMessages, stepCountIs, streamText } from 'ai';

// Langdock blockiert Browser-Anfragen — dieser Handler ist die einzige
// Brücke zwischen Client und Langdock. Der API-Key bleibt server-only.
export const runtime = 'nodejs';

const BASE_SYSTEM_PROMPT = `Du bist Labor — ein persönlicher, wissenschaftlich denkender Assistent für Körper, Ernährung, Performance.

Haltung:
- Wissenschaftlich nüchtern, nicht Coach-Sprache. Keine Streak-/Gamification-Rhetorik.
- Trends vor Einzelwerten. Bewegungsdurchschnitte sind die Aussage, Tageswerte nur das Rauschen.
- Konfidenz und Unsicherheit aussprechen. Keine Fake-Präzision, keine gerundeten Einzelzahlen ohne Range.
- Begründungen sichtbar machen. Wenn du eine Hypothese aufstellst, sag warum.

Stil:
- Knapp, präzise, auf Deutsch.
- Keine Floskeln, keine Disclaimer-Inflation.
- Du-Form.

Datenzugriff:
Unten findest du den aktuellen Stand des Nutzers — soweit erfasst. Beziehe dich darauf, wenn relevant. Wo eine Domäne als „noch keine Daten" markiert ist, sag das offen statt zu raten. Andere Daten als unten gelistet hast du nicht.

Tool-Use (Schreibzugriff):
- Gewicht: Wenn der Nutzer ein Gewicht mitteilt („heute morgen 84,1", „84,3 kg"), nutze log_weight. Leite occurred_at aus dem Kontext ab („heute morgen" → heute, früher Vormittag). Confidence ehrlich angeben (hoch bei klaren Zahlen, niedriger bei mehrdeutigen Eingaben).
- Mahlzeit: Wenn der Nutzer eine Mahlzeit beschreibt („Mittag war Hähnchen-Bowl mit Reis, ca. 600 kcal"), prüfe zuerst per list_meal_templates, ob eine passende Vorlage existiert. Bei klarem Match („mein Standard-Frühstück", Label-Ähnlichkeit) nutze log_meal_from_template. Bei neuer/individueller Mahlzeit nutze log_meal mit eigener Schätzung. Tageszeiten ableiten: Frühstück ~08:00, Mittag ~12:30, Abend ~19:00.
- Korrigieren/Zurückziehen: erst list_recent_weight_entries oder list_recent_meal_entries, dann correct_weight bzw. retract_weight oder retract_meal. Bei Mehrdeutigkeit nachfragen.
- Bei reinen Fragen ohne klare Eintrag-Absicht: keine Tools aufrufen, einfach antworten.

Bestätigungs-Mechanik (wichtig!):
- Schreib-Tools (log_weight, correct_weight, retract_weight) werden NICHT direkt ausgeführt. Der Nutzer sieht in der UI eine Bestätigungs-Karte mit „Abbrechen" und „Ja, speichern" — erst nach Klick wird geschrieben.
- Ergänze daher selbst KEINE separate Bestätigungs-Rückfrage im Text („soll ich speichern?") — die UI macht das. Ruf das Tool einfach mit der besten Interpretation auf.
- Nach erfolgreicher Ausführung: knappe Bestätigung mit dem konkreten Wert und — falls sinnvoll — Einordnung in den Trend („dein 7d-Schnitt steht jetzt bei …"). Keine Floskeln.
- Falls der Nutzer ablehnt (Tool kommt mit Status „nicht gespeichert" zurück): kurz quittieren, keine Wiederholung.`;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

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

    const sections = await buildUserContext(supabase, user.id);
    const contextBlock = renderContextForPrompt(sections);
    const systemPrompt = contextBlock
      ? `${BASE_SYSTEM_PROMPT}\n\n${contextBlock}`
      : BASE_SYSTEM_PROMPT;

    const tools = buildChatTools({ client: supabase, userId: user.id });

    const { LANGDOCK_API_KEY } = serverEnv();
    const langdock = createAnthropic({
      baseURL: 'https://api.langdock.com/anthropic/eu/v1',
      apiKey: LANGDOCK_API_KEY,
    });

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: langdock('claude-sonnet-4-6-default'),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      // Tool-Loop: max. 5 Schritte pro Anfrage (z.B. list_recent → correct → text)
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
