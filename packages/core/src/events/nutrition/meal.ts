import { z } from 'zod';
import { eventEnvelopeBaseSchema, validateEventEnvelope } from '../envelope';

export const MEAL_LOGGED = 'meal_logged' as const;

// Mahlzeit-Slot: explizit gesetzt vom Nutzer oder Chat. Wenn nicht gesetzt,
// leitet die UI den Slot aus occurred_at ab.
export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof mealTypeSchema>;

export const mealItemSchema = z.object({
  label: z.string().min(1).max(200),
  amount_g: z.number().positive().max(10000).optional(),
  kcal: z.number().min(0).max(10000).optional(),
  protein_g: z.number().min(0).max(1000).optional(),
  carbs_g: z.number().min(0).max(1000).optional(),
  fat_g: z.number().min(0).max(1000).optional(),
  // Detail-Naehrwerte (optional). LLM-Ingestion kann sie nicht immer schaetzen.
  sugar_g: z.number().min(0).max(1000).optional(),
  fiber_g: z.number().min(0).max(1000).optional(),
  saturated_fat_g: z.number().min(0).max(1000).optional(),
  salt_g: z.number().min(0).max(100).optional(),
  // Pantry-Bezug. Wenn der Nutzer für diese Komponente einen Pantry-Eintrag
  // bestätigt hat, stehen seine Nährwerte (skaliert auf amount_g) genau hier.
  // Replay/Projektionen können darüber den Eintrag rekonstruieren.
  pantry_item_id: z.string().uuid().optional(),
});
export type MealItem = z.infer<typeof mealItemSchema>;

export const mealLoggedPayloadSchema = z.object({
  label: z.string().min(1).max(200),
  kcal: z.number().min(0).max(20000),
  protein_g: z.number().min(0).max(2000).optional(),
  carbs_g: z.number().min(0).max(2000).optional(),
  fat_g: z.number().min(0).max(2000).optional(),
  // Detail-Naehrwerte (optional). Werden vom Detail-Sheet auf der Ernaehrungs-Seite gezeigt.
  sugar_g: z.number().min(0).max(2000).optional(),
  fiber_g: z.number().min(0).max(2000).optional(),
  saturated_fat_g: z.number().min(0).max(2000).optional(),
  salt_g: z.number().min(0).max(200).optional(),
  items: z.array(mealItemSchema).max(50).optional(),
  // ID einer meal_templates-Zeile, falls die Mahlzeit aus einer Vorlage entstanden ist.
  // Werte (kcal, Makros) sind trotzdem als Snapshot im Payload — Templates können sich ändern.
  template_id: z.string().uuid().optional(),
  // ID einer pantry_items-Zeile, falls die Mahlzeit (oder ihr dominantes Element)
  // einem Pantry-Eintrag entspricht. Werte sind als Snapshot im Payload, da
  // pantry_items.nutrients über Editieren oder Merges nachträglich verschieben kann.
  pantry_item_id: z.string().uuid().optional(),
  // Explizit gesetzter Slot. UI/Projection priorisiert das gegenüber occurred_at-Heuristik.
  meal_type: mealTypeSchema.optional(),
});
export type MealLoggedPayload = z.infer<typeof mealLoggedPayloadSchema>;

export const mealLoggedEventSchema = eventEnvelopeBaseSchema
  .extend({
    type: z.literal(MEAL_LOGGED),
    version: z.literal(1),
    payload: mealLoggedPayloadSchema,
  })
  .superRefine(validateEventEnvelope);
export type MealLoggedEvent = z.infer<typeof mealLoggedEventSchema>;
