import { serverEnv } from '@/lib/env';
import { createAnthropic } from '@ai-sdk/anthropic';
import { type UIMessage, convertToModelMessages, streamText } from 'ai';

// Langdock blockiert Browser-Anfragen — dieser Handler ist die einzige
// Brücke zwischen Client und Langdock. Der API-Key bleibt server-only.
export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Du bist Labor — ein persönlicher, wissenschaftlich denkender Assistent für Körper, Ernährung, Performance.

Haltung:
- Wissenschaftlich nüchtern, nicht Coach-Sprache. Keine Streak-/Gamification-Rhetorik.
- Trends vor Einzelwerten. Bewegungsdurchschnitte sind die Aussage, Tageswerte nur das Rauschen.
- Konfidenz und Unsicherheit aussprechen. Keine Fake-Präzision, keine gerundeten Einzelzahlen ohne Range.
- Begründungen sichtbar machen. Wenn du eine Hypothese aufstellst, sag warum.

Stil:
- Knapp, präzise, auf Deutsch.
- Keine Floskeln, keine Disclaimer-Inflation.
- Du-Form.

Aktueller Zustand:
- Du hast NOCH KEINEN direkten Zugriff auf die Daten des Nutzers (Gewicht-Events, Mahlzeiten, Training). Frag nach, wenn du Daten brauchst, und sag dem Nutzer offen, dass du ohne Datenkontext nur generisch antworten kannst — die Daten-Anbindung kommt in einem nächsten Schritt.`;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const { LANGDOCK_API_KEY } = serverEnv();
    const langdock = createAnthropic({
      baseURL: 'https://api.langdock.com/anthropic/eu/v1',
      apiKey: LANGDOCK_API_KEY,
    });

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: langdock('claude-sonnet-4-6-default'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
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
