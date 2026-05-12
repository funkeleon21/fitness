import { z } from 'zod';
import { eventEnvelopeSchema } from '../envelope';

export const EVENT_CORRECTED = 'event_corrected' as const;
export const EVENT_RETRACTED = 'event_retracted' as const;

export const eventCorrectedPayloadSchema = z.object({
  corrects_event_id: z.string().uuid(),
  reason: z.string().min(1).max(500).nullable(),
  new_payload: z.record(z.unknown()),
});
export type EventCorrectedPayload = z.infer<typeof eventCorrectedPayloadSchema>;

export const eventCorrectedEventSchema = eventEnvelopeSchema.extend({
  type: z.literal(EVENT_CORRECTED),
  version: z.literal(1),
  payload: eventCorrectedPayloadSchema,
});
export type EventCorrectedEvent = z.infer<typeof eventCorrectedEventSchema>;

export const eventRetractedPayloadSchema = z.object({
  retracts_event_id: z.string().uuid(),
  reason: z.string().min(1).max(500).nullable(),
});
export type EventRetractedPayload = z.infer<typeof eventRetractedPayloadSchema>;

export const eventRetractedEventSchema = eventEnvelopeSchema.extend({
  type: z.literal(EVENT_RETRACTED),
  version: z.literal(1),
  payload: eventRetractedPayloadSchema,
});
export type EventRetractedEvent = z.infer<typeof eventRetractedEventSchema>;
