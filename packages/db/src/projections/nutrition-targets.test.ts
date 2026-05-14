import { NUTRITION_TARGETS_SET } from '@fitness/core';
import { describe, expect, it } from 'vitest';
import { type NutritionTargetsEventRow, projectNutritionTargets } from './nutrition-targets';

function row(
  id: string,
  recorded_at: string,
  payload: Record<string, number>,
): NutritionTargetsEventRow {
  return { id, type: NUTRITION_TARGETS_SET, recorded_at, payload };
}

describe('projectNutritionTargets', () => {
  it('returns null state when no events exist', () => {
    const state = projectNutritionTargets([]);
    expect(state.kcal).toBeNull();
    expect(state.protein_g).toBeNull();
  });

  it('applies a single event', () => {
    const state = projectNutritionTargets([
      row('a', '2026-05-14T08:00:00Z', { kcal: 2300, protein_g: 150 }),
    ]);
    expect(state.kcal).toBe(2300);
    expect(state.protein_g).toBe(150);
    expect(state.carbs_g).toBeNull();
  });

  it('overlays later events field-wise without clobbering earlier fields', () => {
    const state = projectNutritionTargets([
      row('a', '2026-05-14T08:00:00Z', { kcal: 2300, protein_g: 150 }),
      row('b', '2026-05-14T10:00:00Z', { protein_g: 180 }),
    ]);
    expect(state.kcal).toBe(2300);
    expect(state.protein_g).toBe(180);
  });

  it('sorts by recorded_at + id even when input is unsorted', () => {
    const state = projectNutritionTargets([
      row('b', '2026-05-14T10:00:00Z', { kcal: 2500 }),
      row('a', '2026-05-14T08:00:00Z', { kcal: 2300 }),
    ]);
    expect(state.kcal).toBe(2500);
  });

  it('ignores events that fail payload validation', () => {
    const state = projectNutritionTargets([
      row('a', '2026-05-14T08:00:00Z', { kcal: 2300 }),
      // kcal = 0 is invalid (must be positive)
      row('b', '2026-05-14T09:00:00Z', { kcal: 0 }),
    ]);
    expect(state.kcal).toBe(2300);
  });

  it('ignores events of other types', () => {
    const state = projectNutritionTargets([
      { id: 'a', type: 'meal_logged', recorded_at: '2026-05-14T08:00:00Z', payload: {} },
      row('b', '2026-05-14T09:00:00Z', { kcal: 2300 }),
    ]);
    expect(state.kcal).toBe(2300);
  });
});
