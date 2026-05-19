import { describe, expect, it } from 'vitest';
import type { WorkoutPoint } from '../../types';
import { getCalendarWeek } from './week-aggregation';

function w(input: {
  id: string;
  occurred_at: string;
  exercises?: Array<{ name: string; sets: Array<{ reps?: number; weight_kg?: number }> }>;
  duration_min?: number;
}): WorkoutPoint {
  return {
    event_id: input.id,
    occurred_at: input.occurred_at,
    label: 'X',
    duration_min: input.duration_min ?? null,
    exercises: input.exercises ?? null,
    mood: null,
    note: null,
    template_id: null,
    source: 'manual',
    confidence: null,
    corrected: false,
  };
}

describe('getCalendarWeek', () => {
  // Donnerstag, 14. Mai 2026 — Wochenstart Mo 11. Mai.
  const NOW = new Date(2026, 4, 14, 22, 0, 0, 0);

  it('isoliert Workouts der aktuellen Mo–So-Woche', () => {
    const workouts = [
      w({ id: 'mo', occurred_at: new Date(2026, 4, 11, 8).toISOString() }),
      w({ id: 'di', occurred_at: new Date(2026, 4, 12, 19).toISOString() }),
      w({ id: 'so-letzte', occurred_at: new Date(2026, 4, 10, 19).toISOString() }),
      w({ id: 'mo-naechste', occurred_at: new Date(2026, 4, 18, 8).toISOString() }),
    ];

    const week = getCalendarWeek(workouts, 0, NOW);

    expect(week.workouts.map((x) => x.event_id)).toEqual(['mo', 'di']);
    expect(week.isCurrent).toBe(true);
    expect(Array.from(week.daysWithWorkout).sort()).toEqual([0, 1]);
  });

  it('aggregiert Sätze und Dauer korrekt', () => {
    const workouts = [
      w({
        id: 'a',
        occurred_at: new Date(2026, 4, 11, 8).toISOString(),
        duration_min: 60,
        exercises: [{ name: 'Bank', sets: [{}, {}, {}] }],
      }),
      w({
        id: 'b',
        occurred_at: new Date(2026, 4, 13, 8).toISOString(),
        duration_min: 45,
        exercises: [
          { name: 'Klimm', sets: [{}, {}] },
          { name: 'Rudern', sets: [{}, {}, {}] },
        ],
      }),
    ];

    const week = getCalendarWeek(workouts, 0, NOW);

    expect(week.totals).toEqual({ count: 2, totalSets: 8, totalDurationMin: 105 });
  });

  it('blättert mit weekOffset eine Woche zurück', () => {
    const workouts = [
      w({ id: 'last', occurred_at: new Date(2026, 4, 5, 8).toISOString() }),
      w({ id: 'now', occurred_at: new Date(2026, 4, 12, 8).toISOString() }),
    ];

    const prev = getCalendarWeek(workouts, -1, NOW);
    expect(prev.workouts.map((x) => x.event_id)).toEqual(['last']);
    expect(prev.isCurrent).toBe(false);
  });
});
