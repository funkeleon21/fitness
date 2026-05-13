import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);

export const eventSourceSchema = z.enum([
  'manual',
  'voice',
  'photo',
  'qr',
  'import',
  'ai-extracted',
]);
export type EventSource = z.infer<typeof eventSourceSchema>;

export const eventProvenanceSchema = z
  .object({
    provider: nonEmptyStringSchema.optional(),
    model: nonEmptyStringSchema.optional(),
    model_version: nonEmptyStringSchema.optional(),
    prompt_hash: nonEmptyStringSchema.optional(),
    input_hash: nonEmptyStringSchema.optional(),
  })
  .strict();
export type EventProvenance = z.infer<typeof eventProvenanceSchema>;

export const eventEnvelopeBaseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.string(),
  version: z.number().int().positive(),
  occurred_at: z.coerce.date(),
  recorded_at: z.coerce.date(),
  source: eventSourceSchema,
  external_id: nonEmptyStringSchema.max(300).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  raw_input: z.string().nullable(),
  provenance: eventProvenanceSchema.nullable(),
});

export type EventEnvelopeBase = z.infer<typeof eventEnvelopeBaseSchema>;

export function validateEventEnvelope(event: EventEnvelopeBase, ctx: z.RefinementCtx): void {
  if (event.source !== 'ai-extracted') return;

  if (event.confidence === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confidence'],
      message: 'ai-extracted events require confidence',
    });
  }

  if (event.raw_input === null || event.raw_input.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['raw_input'],
      message: 'ai-extracted events require raw_input',
    });
  }

  if (event.provenance === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['provenance'],
      message: 'ai-extracted events require provenance',
    });
    return;
  }

  if (!event.provenance.model) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['provenance', 'model'],
      message: 'ai-extracted events require provenance.model',
    });
  }

  if (!event.provenance.prompt_hash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['provenance', 'prompt_hash'],
      message: 'ai-extracted events require provenance.prompt_hash',
    });
  }
}

export const eventEnvelopeSchema = eventEnvelopeBaseSchema.superRefine(validateEventEnvelope);
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
