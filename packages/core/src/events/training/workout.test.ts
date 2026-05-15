import { describe, expect, it } from 'vitest';
import { WORKOUT_LOGGED, workoutLoggedEventSchema } from './workout';

const validWorkoutEvent = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  type: WORKOUT_LOGGED,
  version: 1,
  occurred_at: new Date('2026-05-14T18:00:00Z'),
  recorded_at: new Date('2026-05-14T19:05:00Z'),
  source: 'manual',
  external_id: null,
  confidence: null,
  raw_input: null,
  provenance: null,
  payload: {
    label: 'Push-Day',
    exercises: [
      {
        name: 'Bankdrücken',
        sets: [
          { reps: 8, weight_kg: 80 },
          { reps: 7, weight_kg: 80 },
          { reps: 6, weight_kg: 75 },
        ],
      },
    ],
  },
};

describe('workoutLoggedEventSchema', () => {
  it('accepts a valid strength workout with one exercise', () => {
    const result = workoutLoggedEventSchema.safeParse(validWorkoutEvent);
    expect(result.success).toBe(true);
  });

  it('accepts a minimal cardio-style workout (label only)', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: { label: '5km Lauf' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a workout with duration_min', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: { label: '5km Lauf', duration_min: 32 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a workout with multiple exercises', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: {
        label: 'Push-Day',
        exercises: [
          {
            name: 'Bankdrücken',
            sets: [{ reps: 8, weight_kg: 80 }],
          },
          {
            name: 'Schulterdrücken',
            sets: [
              { reps: 10, weight_kg: 30, rpe: 7 },
              { reps: 10, weight_kg: 30, rpe: 8 },
            ],
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts sets with only a note (e.g. plank)', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: {
        label: 'Core',
        exercises: [
          {
            name: 'Plank',
            sets: [{ note: '60s' }, { note: '50s' }],
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a workout with template_id', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: {
        label: 'Push-Day',
        template_id: '33333333-3333-3333-3333-333333333333',
        exercises: [{ name: 'Bankdrücken', sets: [{ reps: 8, weight_kg: 80 }] }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid template_id', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: { label: 'Push-Day', template_id: 'nope' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty label', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: { label: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an exercise with empty sets array', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: {
        label: 'Push-Day',
        exercises: [{ name: 'Bankdrücken', sets: [] }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative weight_kg', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: {
        label: 'Push-Day',
        exercises: [{ name: 'Bankdrücken', sets: [{ reps: 8, weight_kg: -5 }] }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects rpe out of range', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: {
        label: 'Push-Day',
        exercises: [{ name: 'Bankdrücken', sets: [{ reps: 8, weight_kg: 80, rpe: 12 }] }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration_min above realistic ceiling', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      payload: { label: '5km Lauf', duration_min: 9999 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong type discriminator', () => {
    const result = workoutLoggedEventSchema.safeParse({
      ...validWorkoutEvent,
      type: 'meal_logged',
    });
    expect(result.success).toBe(false);
  });
});
