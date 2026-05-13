import { describe, expect, it } from 'vitest';
import { WEIGHT_LOGGED, weightLoggedEventSchema } from './weight';

const validWeightEvent = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  type: WEIGHT_LOGGED,
  version: 1,
  occurred_at: new Date('2026-05-11T07:00:00Z'),
  recorded_at: new Date('2026-05-11T07:01:00Z'),
  source: 'manual',
  external_id: null,
  confidence: null,
  raw_input: null,
  provenance: null,
  payload: { kg: 84.3 },
};

describe('weightLoggedEventSchema', () => {
  it('accepts a valid weight event', () => {
    const result = weightLoggedEventSchema.safeParse(validWeightEvent);
    expect(result.success).toBe(true);
  });

  it('rejects a negative weight', () => {
    const result = weightLoggedEventSchema.safeParse({
      ...validWeightEvent,
      payload: { kg: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a weight above 500kg', () => {
    const result = weightLoggedEventSchema.safeParse({
      ...validWeightEvent,
      payload: { kg: 501 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a wrong type discriminator', () => {
    const result = weightLoggedEventSchema.safeParse({
      ...validWeightEvent,
      type: 'meal_logged',
    });
    expect(result.success).toBe(false);
  });
});
