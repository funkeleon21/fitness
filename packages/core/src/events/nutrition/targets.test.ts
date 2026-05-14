import { describe, expect, it } from 'vitest';
import { NUTRITION_TARGETS_SET, nutritionTargetsSetEventSchema } from './targets';

const valid = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  type: NUTRITION_TARGETS_SET,
  version: 1,
  occurred_at: new Date('2026-05-14T08:00:00Z'),
  recorded_at: new Date('2026-05-14T08:00:00Z'),
  source: 'manual',
  external_id: null,
  confidence: null,
  raw_input: null,
  provenance: null,
  payload: { kcal: 2300, protein_g: 150 },
};

describe('nutritionTargetsSetEventSchema', () => {
  it('accepts a partial target set', () => {
    const result = nutritionTargetsSetEventSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts setting only a single field', () => {
    const result = nutritionTargetsSetEventSchema.safeParse({
      ...valid,
      payload: { protein_g: 180 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty payload', () => {
    const result = nutritionTargetsSetEventSchema.safeParse({
      ...valid,
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative kcal target', () => {
    const result = nutritionTargetsSetEventSchema.safeParse({
      ...valid,
      payload: { kcal: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unrealistic kcal target', () => {
    const result = nutritionTargetsSetEventSchema.safeParse({
      ...valid,
      payload: { kcal: 50000 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts setting limits (sugar, salt)', () => {
    const result = nutritionTargetsSetEventSchema.safeParse({
      ...valid,
      payload: { sugar_g: 40, salt_g: 5 },
    });
    expect(result.success).toBe(true);
  });
});
