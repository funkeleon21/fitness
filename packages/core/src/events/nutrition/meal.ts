import { z } from 'zod';
import { eventEnvelopeSchema } from '../envelope';

export const MEAL_LOGGED = 'meal_logged' as const;

export const mealItemSchema = z.object({
  label: z.string().min(1).max(200),
  amount_g: z.number().positive().max(10000).optional(),
  kcal: z.number().min(0).max(10000).optional(),
  protein_g: z.number().min(0).max(1000).optional(),
  carbs_g: z.number().min(0).max(1000).optional(),
  fat_g: z.number().min(0).max(1000).optional(),
});
export type MealItem = z.infer<typeof mealItemSchema>;

export const mealLoggedPayloadSchema = z.object({
  label: z.string().min(1).max(200),
  kcal: z.number().min(0).max(20000),
  protein_g: z.number().min(0).max(2000).optional(),
  carbs_g: z.number().min(0).max(2000).optional(),
  fat_g: z.number().min(0).max(2000).optional(),
  items: z.array(mealItemSchema).max(50).optional(),
  // ID einer meal_templates-Zeile, falls die Mahlzeit aus einer Vorlage entstanden ist.
  // Werte (kcal, Makros) sind trotzdem als Snapshot im Payload — Templates können sich ändern.
  template_id: z.string().uuid().optional(),
});
export type MealLoggedPayload = z.infer<typeof mealLoggedPayloadSchema>;

export const mealLoggedEventSchema = eventEnvelopeSchema.extend({
  type: z.literal(MEAL_LOGGED),
  version: z.literal(1),
  payload: mealLoggedPayloadSchema,
});
export type MealLoggedEvent = z.infer<typeof mealLoggedEventSchema>;
