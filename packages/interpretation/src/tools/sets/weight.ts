import { getWeightProjection } from '@fitness/db';
import { correctEvent, logWeight, retractEvent } from '@fitness/ingestion';
import { tool } from 'ai';
import { z } from 'zod';
import { toolExternalId, toolProvenance, toolRawInput } from '../provenance';
import type { ChatToolset } from '../types';

export const weightTools: ChatToolset = ({ client, userId }) => ({
  log_weight: tool({
    description:
      'Trage einen Gewichts-Eintrag des Nutzers ein. Verwende dies, wenn der Nutzer sein aktuelles Gewicht mitteilt (z.B. "heute morgen 84,1", "ich wiege 80,5 kg"). Der Nutzer muss den Eintrag explizit bestätigen — das passiert in der UI, nicht im Chat. Antworte nach Erfolg knapp mit dem gespeicherten Wert und ordne ihn ggf. in den Trend ein.',
    inputSchema: z.object({
      kg: z.number().positive().max(500).describe('Gewicht in kg, z.B. 84.1'),
      occurred_at: z
        .string()
        .datetime()
        .nullable()
        .describe(
          'ISO-8601-Zeitpunkt der Messung. Wenn der Nutzer "heute morgen" oder ähnlich sagt, leite einen plausiblen Zeitpunkt ab. Bei fehlender Angabe: null (= jetzt).',
        ),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Deine Konfidenz, dass dieser Wert korrekt extrahiert wurde (0–1).'),
      raw_input: z
        .string()
        .nullish()
        .describe(
          'Originale Nutzerformulierung, aus der du das Gewicht extrahiert hast. null nur, wenn nicht rekonstruierbar.',
        ),
    }),
    needsApproval: true,
    execute: async ({ kg, occurred_at, confidence, raw_input }) => {
      const occurredAt = occurred_at ? new Date(occurred_at) : new Date();
      const sourceInput = toolRawInput(raw_input, { tool: 'log_weight', kg, occurred_at });
      const result = await logWeight(client, {
        user_id: userId,
        kg,
        occurred_at: occurredAt,
        source: 'ai-extracted',
        external_id: toolExternalId('log_weight', { kg, occurred_at, raw_input: sourceInput }),
        raw_input: sourceInput,
        confidence,
        provenance: toolProvenance(sourceInput),
      });
      return {
        ok: true,
        event_id: result.event_id,
        kg,
        occurred_at: occurredAt.toISOString(),
      };
    },
  }),

  list_recent_weight_entries: tool({
    description:
      'Liste die letzten Gewichts-Einträge des Nutzers inkl. event_id, kg und Datum. Nutze dies, BEVOR du correct_weight oder retract_weight aufrufst, um die richtige event_id zu finden. Auch nützlich, wenn der Nutzer nach einzelnen Einträgen fragt.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .describe('Wie viele letzte Einträge zurückgeben (1–20).'),
    }),
    execute: async ({ limit }) => {
      const projection = await getWeightProjection(client, userId);
      const entries = [...projection.series]
        .reverse()
        .slice(0, limit)
        .map((p) => ({
          event_id: p.event_id,
          kg: p.kg,
          occurred_at: p.occurred_at.toISOString(),
          corrected: p.corrected,
        }));
      return { entries };
    },
  }),

  correct_weight: tool({
    description:
      'Korrigiere einen bestehenden Gewichts-Eintrag. Nutze list_recent_weight_entries zuerst, um die korrekte event_id zu erhalten. Bei Mehrdeutigkeit ("der letzte" obwohl zwei am selben Tag) lieber nachfragen. Der Nutzer bestätigt die Korrektur über die UI bevor sie geschrieben wird.',
    inputSchema: z.object({
      event_id: z.string().uuid().describe('UUID des zu korrigierenden Eintrags.'),
      kg: z.number().positive().max(500).describe('Der korrigierte Wert in kg.'),
      reason: z
        .string()
        .nullable()
        .describe('Optional: Grund der Korrektur (z.B. "Tippfehler"). null wenn nicht angegeben.'),
      raw_input: z
        .string()
        .nullish()
        .describe(
          'Originale Nutzerformulierung, aus der du die Korrektur abgeleitet hast. null nur, wenn nicht rekonstruierbar.',
        ),
    }),
    needsApproval: true,
    execute: async ({ event_id, kg, reason, raw_input }) => {
      const sourceInput = toolRawInput(raw_input, {
        tool: 'correct_weight',
        event_id,
        kg,
        reason,
      });
      const result = await correctEvent(client, {
        user_id: userId,
        corrects_event_id: event_id,
        new_payload: { kg },
        reason: reason ?? 'chat correction',
        source: 'ai-extracted',
        external_id: toolExternalId('correct_weight', {
          event_id,
          kg,
          reason,
          raw_input: sourceInput,
        }),
        raw_input: sourceInput,
        confidence: 0.9,
        provenance: toolProvenance(sourceInput),
      });
      return { ok: true, event_id: result.event_id, corrects_event_id: event_id, new_kg: kg };
    },
  }),

  retract_weight: tool({
    description:
      'Ziehe einen Gewichts-Eintrag zurück (Soft-Delete). Der Eintrag verschwindet aus Trends, bleibt aber im Event-Log. Nutze list_recent_weight_entries zuerst. Der Nutzer bestätigt die Aktion über die UI bevor sie geschrieben wird.',
    inputSchema: z.object({
      event_id: z.string().uuid().describe('UUID des zurückzuziehenden Eintrags.'),
      reason: z
        .string()
        .nullable()
        .describe('Optional: Grund (z.B. "versehentlich eingetragen"). null wenn nicht angegeben.'),
      raw_input: z
        .string()
        .nullish()
        .describe(
          'Originale Nutzerformulierung, aus der du die Retraction abgeleitet hast. null nur, wenn nicht rekonstruierbar.',
        ),
    }),
    needsApproval: true,
    execute: async ({ event_id, reason, raw_input }) => {
      const sourceInput = toolRawInput(raw_input, { tool: 'retract_weight', event_id, reason });
      const result = await retractEvent(client, {
        user_id: userId,
        retracts_event_id: event_id,
        reason: reason ?? 'chat retraction',
        source: 'ai-extracted',
        external_id: toolExternalId('retract_weight', {
          event_id,
          reason,
          raw_input: sourceInput,
        }),
        raw_input: sourceInput,
        confidence: 0.9,
        provenance: toolProvenance(sourceInput),
      });
      return { ok: true, event_id: result.event_id, retracts_event_id: event_id };
    },
  }),
});
