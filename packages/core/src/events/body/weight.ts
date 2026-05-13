import { z } from 'zod';
import { eventEnvelopeBaseSchema, validateEventEnvelope } from '../envelope';

export const WEIGHT_LOGGED = 'weight_logged' as const;

export const weightLoggedPayloadSchema = z.object({
  kg: z.number().positive().max(500),
});
export type WeightLoggedPayload = z.infer<typeof weightLoggedPayloadSchema>;

export const weightLoggedEventSchema = eventEnvelopeBaseSchema
  .extend({
    type: z.literal(WEIGHT_LOGGED),
    version: z.literal(1),
    payload: weightLoggedPayloadSchema,
  })
  .superRefine(validateEventEnvelope);
export type WeightLoggedEvent = z.infer<typeof weightLoggedEventSchema>;
