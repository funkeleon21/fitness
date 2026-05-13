import { describe, expect, it } from 'vitest';
import { MEAL_LOGGED, mealLoggedEventSchema } from './meal';

const validMealEvent = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  type: MEAL_LOGGED,
  version: 1,
  occurred_at: new Date('2026-05-13T12:30:00Z'),
  recorded_at: new Date('2026-05-13T12:31:00Z'),
  source: 'manual',
  external_id: null,
  confidence: null,
  raw_input: null,
  provenance: null,
  payload: {
    label: 'Hähnchen-Reis-Bowl',
    kcal: 612,
    protein_g: 48,
    carbs_g: 70,
    fat_g: 14,
  },
};

describe('mealLoggedEventSchema', () => {
  it('accepts a valid meal event with macros', () => {
    const result = mealLoggedEventSchema.safeParse(validMealEvent);
    expect(result.success).toBe(true);
  });

  it('accepts a minimal meal event (label + kcal only)', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      payload: { label: 'Apfel', kcal: 90 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a meal event with template_id', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      payload: {
        label: 'Standard-Frühstück',
        kcal: 420,
        protein_g: 32,
        template_id: '33333333-3333-3333-3333-333333333333',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid template_id', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      payload: { label: 'Apfel', kcal: 90, template_id: 'nope' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a meal event with items', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      payload: {
        label: 'Skyr mit Beeren',
        kcal: 220,
        protein_g: 24,
        items: [
          { label: 'Skyr', amount_g: 200, kcal: 130, protein_g: 22 },
          { label: 'Beeren', amount_g: 100, kcal: 50 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty label', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      payload: { label: '', kcal: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative kcal', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      payload: { label: 'Apfel', kcal: -5 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unrealistic kcal value', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      payload: { label: 'Apfel', kcal: 99999 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong type discriminator', () => {
    const result = mealLoggedEventSchema.safeParse({
      ...validMealEvent,
      type: 'weight_logged',
    });
    expect(result.success).toBe(false);
  });
});
