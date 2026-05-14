import { z } from 'zod';
import { eventEnvelopeBaseSchema, validateEventEnvelope } from '../envelope';

export const NUTRITION_TARGETS_SET = 'nutrition_targets_set' as const;

// Persönliche Tages-Ziele. Alle Felder optional — der User setzt nur das,
// was er gerade anpassen will. Spätere Events überlagern frühere Felder
// (field-wise overlay) statt sie zu ersetzen.
export const nutritionTargetsSetPayloadSchema = z.object({
  kcal: z.number().positive().max(20000).optional(),
  protein_g: z.number().min(0).max(2000).optional(),
  carbs_g: z.number().min(0).max(2000).optional(),
  fat_g: z.number().min(0).max(2000).optional(),
  sugar_g: z.number().min(0).max(2000).optional(),
  fiber_g: z.number().min(0).max(2000).optional(),
  saturated_fat_g: z.number().min(0).max(2000).optional(),
  salt_g: z.number().min(0).max(200).optional(),
});
export type NutritionTargetsSetPayload = z.infer<typeof nutritionTargetsSetPayloadSchema>;

export const nutritionTargetsSetEventSchema = eventEnvelopeBaseSchema
  .extend({
    type: z.literal(NUTRITION_TARGETS_SET),
    version: z.literal(1),
    payload: nutritionTargetsSetPayloadSchema,
  })
  .superRefine((data, ctx) => {
    validateEventEnvelope(data, ctx);
    // Payload muss mindestens ein Feld setzen — leere Events sind sinnlos.
    const fields = Object.values(data.payload).filter((v) => v !== undefined);
    if (fields.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mindestens ein Ziel-Feld muss gesetzt werden.',
        path: ['payload'],
      });
    }
  });
export type NutritionTargetsSetEvent = z.infer<typeof nutritionTargetsSetEventSchema>;
