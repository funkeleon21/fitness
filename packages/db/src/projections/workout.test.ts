import { EVENT_CORRECTED, EVENT_RETRACTED, WORKOUT_LOGGED } from '@fitness/core';
import { describe, expect, it } from 'vitest';
import { type WorkoutProjectionEventRow, projectWorkoutEvents } from './workout';

const WORKOUT_1 = '11111111-1111-1111-1111-111111111111';
const WORKOUT_2 = '22222222-2222-2222-2222-222222222222';
const CORRECTION_1 = '33333333-3333-3333-3333-333333333333';
const CORRECTION_2 = '44444444-4444-4444-4444-444444444444';
const RETRACTION_1 = '55555555-5555-5555-5555-555555555555';

function workoutRow(input: {
  id: string;
  label: string;
  duration_min?: number;
  exercises?: Array<{ name: string; sets: Array<{ reps?: number; weight_kg?: number }> }>;
  occurred_at: string;
  recorded_at: string;
}): WorkoutProjectionEventRow {
  const payload: Record<string, unknown> = { label: input.label };
  if (input.duration_min !== undefined) payload.duration_min = input.duration_min;
  if (input.exercises !== undefined) payload.exercises = input.exercises;
  return {
    id: input.id,
    type: WORKOUT_LOGGED,
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
  fields: Record<string, unknown>;
  recorded_at: string;
}): WorkoutProjectionEventRow {
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
}): WorkoutProjectionEventRow {
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

describe('projectWorkoutEvents', () => {
  it('projects today + thisWeek + totals', () => {
    const projection = projectWorkoutEvents(
      [
        workoutRow({
          id: WORKOUT_1,
          label: 'Push-Day',
          duration_min: 65,
          exercises: [
            {
              name: 'Bankdrücken',
              sets: [
                { reps: 8, weight_kg: 80 },
                { reps: 7, weight_kg: 80 },
                { reps: 6, weight_kg: 75 },
              ],
            },
            {
              name: 'Schulterdrücken',
              sets: [
                { reps: 10, weight_kg: 30 },
                { reps: 10, weight_kg: 30 },
              ],
            },
          ],
          occurred_at: '2026-05-14T18:00:00.000Z',
          recorded_at: '2026-05-14T19:05:00.000Z',
        }),
        workoutRow({
          id: WORKOUT_2,
          label: 'Pull-Day',
          duration_min: 55,
          exercises: [
            {
              name: 'Klimmzüge',
              sets: [{ reps: 10 }, { reps: 8 }],
            },
          ],
          occurred_at: '2026-05-12T18:00:00.000Z',
          recorded_at: '2026-05-12T19:05:00.000Z',
        }),
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.today).toHaveLength(1);
    expect(projection.today[0]?.event_id).toBe(WORKOUT_1);
    expect(projection.thisWeek).toHaveLength(2);
    expect(projection.thisWeekTotals).toEqual({
      count: 2,
      totalSets: 5 + 2,
      totalDurationMin: 65 + 55,
    });
    expect(projection.recent.map((w) => w.event_id)).toEqual([WORKOUT_1, WORKOUT_2]);
    expect(projection.allWorkouts.map((w) => w.event_id)).toEqual([WORKOUT_1, WORKOUT_2]);
  });

  it('exposes allWorkouts newest-first without retracted entries', () => {
    const projection = projectWorkoutEvents(
      [
        workoutRow({
          id: WORKOUT_1,
          label: 'Alt',
          occurred_at: '2026-04-01T18:00:00.000Z',
          recorded_at: '2026-04-01T19:00:00.000Z',
        }),
        workoutRow({
          id: WORKOUT_2,
          label: 'Neu',
          occurred_at: '2026-05-10T18:00:00.000Z',
          recorded_at: '2026-05-10T19:00:00.000Z',
        }),
        retractionRow({
          id: RETRACTION_1,
          target: WORKOUT_1,
          recorded_at: '2026-05-10T19:30:00.000Z',
        }),
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.allWorkouts.map((w) => w.event_id)).toEqual([WORKOUT_2]);
  });

  it('excludes workouts older than 7 days from thisWeek', () => {
    const projection = projectWorkoutEvents(
      [
        workoutRow({
          id: WORKOUT_1,
          label: 'Alt',
          occurred_at: '2026-05-01T18:00:00.000Z',
          recorded_at: '2026-05-01T19:00:00.000Z',
        }),
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.thisWeek).toHaveLength(0);
    expect(projection.thisWeekTotals.count).toBe(0);
    expect(projection.recent).toHaveLength(1);
  });

  it('applies a label correction', () => {
    const projection = projectWorkoutEvents(
      [
        workoutRow({
          id: WORKOUT_1,
          label: 'Push',
          occurred_at: '2026-05-14T18:00:00.000Z',
          recorded_at: '2026-05-14T19:00:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_1,
          target: WORKOUT_1,
          fields: { label: 'Push-Day (heavy)' },
          recorded_at: '2026-05-14T19:30:00.000Z',
        }),
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.today[0]?.label).toBe('Push-Day (heavy)');
    expect(projection.today[0]?.corrected).toBe(true);
  });

  it('applies an exercises correction (replaces the whole array)', () => {
    const projection = projectWorkoutEvents(
      [
        workoutRow({
          id: WORKOUT_1,
          label: 'Push-Day',
          exercises: [{ name: 'Bankdrücken', sets: [{ reps: 8, weight_kg: 80 }] }],
          occurred_at: '2026-05-14T18:00:00.000Z',
          recorded_at: '2026-05-14T19:00:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_1,
          target: WORKOUT_1,
          fields: {
            exercises: [
              {
                name: 'Bankdrücken',
                sets: [
                  { reps: 8, weight_kg: 82.5 },
                  { reps: 7, weight_kg: 82.5 },
                ],
              },
            ],
          },
          recorded_at: '2026-05-14T19:30:00.000Z',
        }),
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.today[0]?.exercises).toHaveLength(1);
    expect(projection.today[0]?.exercises?.[0]?.sets).toHaveLength(2);
    expect(projection.today[0]?.exercises?.[0]?.sets[0]?.weight_kg).toBe(82.5);
    expect(projection.today[0]?.corrected).toBe(true);
  });

  it('falls back when a later correction is retracted', () => {
    const projection = projectWorkoutEvents(
      [
        workoutRow({
          id: WORKOUT_1,
          label: 'Push',
          occurred_at: '2026-05-14T18:00:00.000Z',
          recorded_at: '2026-05-14T19:00:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_1,
          target: WORKOUT_1,
          fields: { label: 'Push (heavy)' },
          recorded_at: '2026-05-14T19:30:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_2,
          target: CORRECTION_1,
          fields: { label: 'Pull (typo)' },
          recorded_at: '2026-05-14T19:40:00.000Z',
        }),
        retractionRow({
          id: RETRACTION_1,
          target: CORRECTION_2,
          recorded_at: '2026-05-14T19:45:00.000Z',
        }),
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.today[0]?.label).toBe('Push (heavy)');
    expect(projection.today[0]?.corrected).toBe(true);
  });

  it('removes retracted workout events from the projection', () => {
    const projection = projectWorkoutEvents(
      [
        workoutRow({
          id: WORKOUT_1,
          label: 'Push',
          occurred_at: '2026-05-14T18:00:00.000Z',
          recorded_at: '2026-05-14T19:00:00.000Z',
        }),
        workoutRow({
          id: WORKOUT_2,
          label: 'Doppelt',
          occurred_at: '2026-05-14T18:05:00.000Z',
          recorded_at: '2026-05-14T19:01:00.000Z',
        }),
        retractionRow({
          id: RETRACTION_1,
          target: WORKOUT_2,
          recorded_at: '2026-05-14T19:10:00.000Z',
        }),
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.today.map((w) => w.event_id)).toEqual([WORKOUT_1]);
    expect(projection.thisWeekTotals.count).toBe(1);
  });

  it('ignores invalid workout payload silently', () => {
    const projection = projectWorkoutEvents(
      [
        {
          id: WORKOUT_1,
          type: WORKOUT_LOGGED,
          occurred_at: '2026-05-14T18:00:00.000Z',
          recorded_at: '2026-05-14T19:00:00.000Z',
          source: 'manual',
          confidence: null,
          raw_input: null,
          payload: { label: '' }, // empty label invalid
        },
      ],
      new Date('2026-05-14T20:00:00.000Z'),
    );

    expect(projection.today).toHaveLength(0);
  });
});
