import { z } from 'zod';
import { eventEnvelopeSchema } from '../envelope';

export const WEIGHT_LOGGED = 'weight_logged' as const;

export const weightLoggedPayloadSchema = z.object({
  kg: z.number().positive().max(500),
});
export type WeightLoggedPayload = z.infer<typeof weightLoggedPayloadSchema>;

export const weightLoggedEventSchema = eventEnvelopeSchema.extend({
  type: z.literal(WEIGHT_LOGGED),
  version: z.literal(1),
  payload: weightLoggedPayloadSchema,
});
export type WeightLoggedEvent = z.infer<typeof weightLoggedEventSchema>;
