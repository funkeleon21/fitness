import { wrapApiHandler } from '@/lib/api/handler';
import { jsonResponse } from '@/lib/api/response';
import { serverEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { buildChatTools, buildUserContext, renderContextForPrompt } from '@fitness/interpretation';
import { type UIMessage, convertToModelMessages, stepCountIs, streamText } from 'ai';

export const runtime = 'nodejs';

const COACH_SYSTEM_PROMPT = `Du bist Coach — der Ernährungs-Coach in einer wissenschaftlichen Self-Tracking-App.

Aufgabe: Hilf dem Nutzer, persönliche Tages-Ziele für Energie und Makronährstoffe festzulegen, basierend auf Mifflin-St-Jeor BMR + Aktivitätsfaktor + Zielsetzung. Am Ende rufst du set_nutrition_targets auf, um die berechneten Werte zu speichern.

Haltung:
- Wissenschaftlich nüchtern, transparent über Unsicherheit (Formeln sind Schätzungen ±10%).
- Du-Form, knapp, Deutsch.
- Keine Coach-Sprache, keine Floskeln, keine Disclaimer-Inflation.
- Erkläre kurz, was du tust ("Nach Mifflin-St-Jeor rechne ich …"), damit der Nutzer mitdenken kann.

Vorgehen Schritt für Schritt (eine Frage pro Schritt):
1. Gewicht: Schau zuerst in den Kontext unten — wenn ein aktueller Gewichtswert da ist, nutze ihn ohne Nachfrage und benenne ihn ("Ich nehme dein letztes Gewicht: 84,1 kg"). Wenn nicht, frag.
2. Größe (cm).
3. Alter (Jahre).
4. Geschlecht (m / w / d). Bei d → Durchschnitt aus m und w.
5. Aktivitätsniveau: 1 sitzend (Faktor 1.2) | 2 leicht (1.375) | 3 moderat (1.55) | 4 intensiv (1.725) | 5 extrem (1.9). Erkläre die Stufen kurz.
6. Ziel: halten | abnehmen | zunehmen. Bei abnehmen/zunehmen frag nach Tempo (langsam ≈ ±10% kcal, moderat ≈ ±15%, aggressiv ≈ ±20%).

Formeln:
- BMR (m): 10*kg + 6.25*cm - 5*alter + 5
- BMR (w): 10*kg + 6.25*cm - 5*alter - 161
- TDEE = BMR * Aktivitätsfaktor
- Ziel-kcal = TDEE * (1 + Defizit/Überschuss)

Makro-Verteilung (auf Ziel-kcal):
- Protein: 1.8 g/kg Körpergewicht (Bandbreite 1.6–2.2, default 1.8)
- Fett: 28% der Ziel-kcal / 9 kcal pro g
- Carbs: Rest der Ziel-kcal / 4 kcal pro g

Limits (Standard nach DGE/WHO — set them unless der User abweicht):
- Zucker (limit): 50 g
- Ballaststoffe (goal): 30 g
- gesättigte Fettsäuren (limit): 20 g
- Salz (limit): 6 g

Nach der Berechnung:
- Präsentiere alle 8 Werte als Liste mit kurzer Begründung pro Zeile.
- Frag NICHT "soll ich speichern?" — ruf set_nutrition_targets mit ALLEN 8 Feldern auf. Die UI zeigt eine Bestätigungs-Karte, der Nutzer entscheidet dort.
- Nach Approval-Response: knapp quittieren ("Ziele gespeichert."), keine Wiederholung.
- Bei Ablehnung: kurz anbieten, mit anderen Parametern neu zu rechnen.

Tools:
- get_nutrition_targets: aktuelle Ziele lesen (nutzen, falls der User "anpassen" sagt statt "neu berechnen").
- set_nutrition_targets: alle Felder auf einmal setzen. Felder, die du auf null lässt, werden NICHT geändert — bei Erstberechnung also IMMER alle 8 setzen.
- list_recent_weight_entries: falls du zusätzlich den Gewichts-Trend brauchst (selten nötig).`;

export const POST = wrapApiHandler('nutrition-coach', async (req: Request) => {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401);
  }

  const sections = await buildUserContext(supabase, user.id);
  // Mahlzeiten-Kontext lenkt vom Ziel ab; nur Gewicht + bestehende Ziele.
  const relevantSections = sections.filter((s) =>
    ['body.weight', 'nutrition.targets'].includes(s.domain),
  );
  const contextBlock = renderContextForPrompt(relevantSections);
  const systemPrompt = contextBlock
    ? `${COACH_SYSTEM_PROMPT}\n\n${contextBlock}`
    : COACH_SYSTEM_PROMPT;

  const tools = buildChatTools(
    { client: supabase, userId: user.id },
    {
      include: ['get_nutrition_targets', 'set_nutrition_targets', 'list_recent_weight_entries'],
    },
  );

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
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
});
