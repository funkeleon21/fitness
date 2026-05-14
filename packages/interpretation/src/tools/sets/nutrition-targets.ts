import { getNutritionTargets } from '@fitness/db';
import { setNutritionTargets } from '@fitness/ingestion';
import { tool } from 'ai';
import { z } from 'zod';
import { toolExternalId, toolProvenance, toolRawInput } from '../provenance';
import type { ChatToolset } from '../types';

// Tool-Schema: alle Felder nullable, weil der User typischerweise nur ein
// paar Werte gleichzeitig setzt. Mindestens ein Wert wird in execute geprüft.
const targetsInputSchema = z.object({
  kcal: z
    .number()
    .positive()
    .max(20000)
    .nullable()
    .describe('Tagesziel Kalorien. null wenn der User dieses Feld nicht erwähnt.'),
  protein_g: z
    .number()
    .min(0)
    .max(2000)
    .nullable()
    .describe('Tagesziel Protein in Gramm. null wenn nicht erwähnt.'),
  carbs_g: z.number().min(0).max(2000).nullable().describe('Tagesziel Kohlenhydrate in Gramm.'),
  fat_g: z.number().min(0).max(2000).nullable().describe('Tagesziel Fett in Gramm.'),
  sugar_g: z
    .number()
    .min(0)
    .max(2000)
    .nullable()
    .describe('Tages-Obergrenze Zucker in Gramm (Limit, nicht Ziel).'),
  fiber_g: z.number().min(0).max(2000).nullable().describe('Tagesziel Ballaststoffe in Gramm.'),
  saturated_fat_g: z
    .number()
    .min(0)
    .max(2000)
    .nullable()
    .describe('Tages-Obergrenze gesättigte Fettsäuren in Gramm (Limit).'),
  salt_g: z.number().min(0).max(200).nullable().describe('Tages-Obergrenze Salz in Gramm (Limit).'),
  raw_input: z
    .string()
    .nullish()
    .describe('Originale Nutzerformulierung. null wenn nicht rekonstruierbar.'),
});

export const nutritionTargetsTools: ChatToolset = ({ client, userId }) => ({
  get_nutrition_targets: tool({
    description:
      'Lies die aktuellen persönlichen Tages-Ziele des Nutzers (kcal, Makros, Limits). Nutze dies, BEVOR du set_nutrition_targets aufrufst, um zu sehen was schon gesetzt ist und damit der User nicht versehentlich Werte überschreibt, die er nicht gemeint hat.',
    inputSchema: z.object({}),
    execute: async () => {
      const targets = await getNutritionTargets(client, userId);
      return { targets };
    },
  }),

  set_nutrition_targets: tool({
    description:
      'Setze oder aktualisiere persönliche Tages-Ziele (kcal, Protein, Carbs, Fett) oder Limits (Zucker, gesättigte Fettsäuren, Salz). Felder, die du auf null setzt, werden NICHT geändert — sie behalten ihren bisherigen Wert. Nutze dies, wenn der User explizit Werte nennt ("ich peile 2.300 kcal an", "150g Protein pro Tag"). Der User bestätigt die Änderung über die UI bevor sie geschrieben wird.',
    inputSchema: targetsInputSchema,
    needsApproval: true,
    execute: async (input) => {
      const payload: Record<string, number> = {};
      if (input.kcal !== null) payload.kcal = input.kcal;
      if (input.protein_g !== null) payload.protein_g = input.protein_g;
      if (input.carbs_g !== null) payload.carbs_g = input.carbs_g;
      if (input.fat_g !== null) payload.fat_g = input.fat_g;
      if (input.sugar_g !== null) payload.sugar_g = input.sugar_g;
      if (input.fiber_g !== null) payload.fiber_g = input.fiber_g;
      if (input.saturated_fat_g !== null) payload.saturated_fat_g = input.saturated_fat_g;
      if (input.salt_g !== null) payload.salt_g = input.salt_g;

      if (Object.keys(payload).length === 0) {
        throw new Error('Mindestens ein Ziel-Feld muss gesetzt werden.');
      }

      const sourceInput = toolRawInput(input.raw_input, {
        tool: 'set_nutrition_targets',
        payload,
      });
      const result = await setNutritionTargets(client, {
        user_id: userId,
        payload,
        source: 'ai-extracted',
        external_id: toolExternalId('set_nutrition_targets', { payload, raw_input: sourceInput }),
        raw_input: sourceInput,
        confidence: 0.95,
        provenance: toolProvenance(sourceInput),
      });
      return { ok: true, event_id: result.event_id, applied: payload };
    },
  }),
});
