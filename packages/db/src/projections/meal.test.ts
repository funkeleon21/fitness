import { EVENT_CORRECTED, EVENT_RETRACTED, MEAL_LOGGED } from '@fitness/core';
import { describe, expect, it } from 'vitest';
import { type MealProjectionEventRow, projectMealEvents } from './meal';

const MEAL_1 = '11111111-1111-1111-1111-111111111111';
const MEAL_2 = '22222222-2222-2222-2222-222222222222';
const CORRECTION_1 = '33333333-3333-3333-3333-333333333333';
const CORRECTION_2 = '44444444-4444-4444-4444-444444444444';
const RETRACTION_1 = '55555555-5555-5555-5555-555555555555';

function mealRow(input: {
  id: string;
  label: string;
  kcal: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  occurred_at: string;
  recorded_at: string;
}): MealProjectionEventRow {
  const payload: Record<string, unknown> = {
    label: input.label,
    kcal: input.kcal,
  };
  if (input.protein_g !== undefined) payload.protein_g = input.protein_g;
  if (input.carbs_g !== undefined) payload.carbs_g = input.carbs_g;
  if (input.fat_g !== undefined) payload.fat_g = input.fat_g;

  return {
    id: input.id,
    type: MEAL_LOGGED,
    occurred_at: input.occurred_at,
    recorded_at: input.recorded_at,
    source: 'manual',
    confidence: null,
    raw_input: null,
    payload,
  };
}

function correctionRow(input: {
  id: string;
  target: string;
  fields: {
    label?: string;
    kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
  recorded_at: string;
}): MealProjectionEventRow {
  return {
    id: input.id,
    type: EVENT_CORRECTED,
    occurred_at: input.recorded_at,
    recorded_at: input.recorded_at,
    source: 'manual',
    confidence: null,
    raw_input: null,
    payload: {
      corrects_event_id: input.target,
      reason: 'Tippfehler',
      new_payload: input.fields,
    },
  };
}

function retractionRow(input: {
  id: string;
  target: string;
  recorded_at: string;
}): MealProjectionEventRow {
  return {
    id: input.id,
    type: EVENT_RETRACTED,
    occurred_at: input.recorded_at,
    recorded_at: input.recorded_at,
    source: 'manual',
    confidence: null,
    raw_input: null,
    payload: {
      retracts_event_id: input.target,
      reason: 'Doppelte Eingabe',
    },
  };
}

describe('projectMealEvents', () => {
  it('projects todays meals and totals', () => {
    const projection = projectMealEvents(
      [
        mealRow({
          id: MEAL_1,
          label: 'Frühstück',
          kcal: 500,
          protein_g: 30,
          carbs_g: 50,
          fat_g: 15,
          occurred_at: '2026-05-13T07:30:00.000Z',
          recorded_at: '2026-05-13T07:31:00.000Z',
        }),
        mealRow({
          id: MEAL_2,
          label: 'Mittag',
          kcal: 700,
          protein_g: 40,
          carbs_g: 70,
          fat_g: 20,
          occurred_at: '2026-05-13T12:30:00.000Z',
          recorded_at: '2026-05-13T12:31:00.000Z',
        }),
      ],
      new Date('2026-05-13T20:00:00.000Z'),
    );

    expect(projection.today).toHaveLength(2);
    expect(projection.todayTotals).toEqual({
      kcal: 1200,
      protein_g: 70,
      carbs_g: 120,
      fat_g: 35,
      count: 2,
    });
    expect(projection.recent.map((m) => m.event_id)).toEqual([MEAL_2, MEAL_1]);
  });

  it('replays corrections by recorded_at even when input rows are unsorted', () => {
    const projection = projectMealEvents(
      [
        correctionRow({
          id: CORRECTION_1,
          target: MEAL_1,
          fields: { kcal: 550 },
          recorded_at: '2026-05-13T08:00:00.000Z',
        }),
        mealRow({
          id: MEAL_1,
          label: 'Frühstück',
          kcal: 500,
          occurred_at: '2026-05-13T07:30:00.000Z',
          recorded_at: '2026-05-13T07:31:00.000Z',
        }),
      ],
      new Date('2026-05-13T20:00:00.000Z'),
    );

    expect(projection.today).toHaveLength(1);
    expect(projection.today[0]?.kcal).toBe(550);
    expect(projection.today[0]?.corrected).toBe(true);
  });

  it('applies partial corrections cumulatively across the chain', () => {
    const projection = projectMealEvents(
      [
        mealRow({
          id: MEAL_1,
          label: 'Mittag',
          kcal: 700,
          protein_g: 40,
          occurred_at: '2026-05-13T12:30:00.000Z',
          recorded_at: '2026-05-13T12:31:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_1,
          target: MEAL_1,
          fields: { kcal: 800 },
          recorded_at: '2026-05-13T13:00:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_2,
          target: CORRECTION_1,
          fields: { label: 'Mittag (Reis)' },
          recorded_at: '2026-05-13T13:30:00.000Z',
        }),
      ],
      new Date('2026-05-13T20:00:00.000Z'),
    );

    expect(projection.today).toHaveLength(1);
    expect(projection.today[0]?.kcal).toBe(800);
    expect(projection.today[0]?.label).toBe('Mittag (Reis)');
    expect(projection.today[0]?.protein_g).toBe(40);
    expect(projection.today[0]?.corrected).toBe(true);
  });

  it('falls back to earlier correction value when a later correction is retracted', () => {
    const projection = projectMealEvents(
      [
        mealRow({
          id: MEAL_1,
          label: 'Mittag',
          kcal: 700,
          occurred_at: '2026-05-13T12:30:00.000Z',
          recorded_at: '2026-05-13T12:31:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_1,
          target: MEAL_1,
          fields: { kcal: 800 },
          recorded_at: '2026-05-13T13:00:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_2,
          target: CORRECTION_1,
          fields: { kcal: 900 },
          recorded_at: '2026-05-13T13:30:00.000Z',
        }),
        retractionRow({
          id: RETRACTION_1,
          target: CORRECTION_2,
          recorded_at: '2026-05-13T14:00:00.000Z',
        }),
      ],
      new Date('2026-05-13T20:00:00.000Z'),
    );

    expect(projection.today).toHaveLength(1);
    expect(projection.today[0]?.kcal).toBe(800);
    expect(projection.today[0]?.corrected).toBe(true);
  });

  it('removes retracted meal events from the projection', () => {
    const projection = projectMealEvents(
      [
        mealRow({
          id: MEAL_1,
          label: 'Frühstück',
          kcal: 500,
          occurred_at: '2026-05-13T07:30:00.000Z',
          recorded_at: '2026-05-13T07:31:00.000Z',
        }),
        mealRow({
          id: MEAL_2,
          label: 'Doppelt',
          kcal: 500,
          occurred_at: '2026-05-13T07:35:00.000Z',
          recorded_at: '2026-05-13T07:36:00.000Z',
        }),
        retractionRow({
          id: RETRACTION_1,
          target: MEAL_2,
          recorded_at: '2026-05-13T07:40:00.000Z',
        }),
      ],
      new Date('2026-05-13T20:00:00.000Z'),
    );

    expect(projection.today.map((m) => m.event_id)).toEqual([MEAL_1]);
    expect(projection.todayTotals.count).toBe(1);
    expect(projection.todayTotals.kcal).toBe(500);
  });
});
