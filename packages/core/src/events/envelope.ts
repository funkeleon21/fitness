import { z } from 'zod';

export const eventSourceSchema = z.enum([
  'manual',
  'voice',
  'photo',
  'qr',
  'import',
  'ai-extracted',
]);
export type EventSource = z.infer<typeof eventSourceSchema>;

export const eventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string(),
  version: z.number().int().positive(),
  occurred_at: z.coerce.date(),
  recorded_at: z.coerce.date(),
  source: eventSourceSchema,
  confidence: z.number().min(0).max(1).nullable(),
  raw_input: z.string().nullable(),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
