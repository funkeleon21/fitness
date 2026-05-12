import { describe, expect, it } from 'vitest';
import { eventEnvelopeSchema } from './envelope';

const validEnvelope = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  type: 'weight_logged',
  version: 1,
  occurred_at: new Date('2026-05-11T07:00:00Z'),
  recorded_at: new Date('2026-05-11T07:01:00Z'),
  source: 'manual',
  confidence: null,
  raw_input: null,
};

describe('eventEnvelopeSchema', () => {
  it('accepts a minimal valid envelope', () => {
    const result = eventEnvelopeSchema.safeParse(validEnvelope);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid source', () => {
    const result = eventEnvelopeSchema.safeParse({ ...validEnvelope, source: 'magic' });
    expect(result.success).toBe(false);
  });

  it('rejects confidence > 1', () => {
    const result = eventEnvelopeSchema.safeParse({ ...validEnvelope, confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it('accepts a non-null raw_input for ai-extracted events', () => {
    const result = eventEnvelopeSchema.safeParse({
      ...validEnvelope,
      source: 'ai-extracted',
      confidence: 0.9,
      raw_input: 'heute morgen 84,3',
    });
    expect(result.success).toBe(true);
  });
});
