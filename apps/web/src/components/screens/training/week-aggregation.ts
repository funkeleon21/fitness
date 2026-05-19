import type { WorkoutPoint } from '../../types';

export interface CalendarWeek {
  // weekOffset 0 = aktuelle Woche, -1 = letzte, +1 = nächste (in der UI gesperrt).
  weekOffset: number;
  // Mo 00:00 lokal als Date.
  start: Date;
  // So 23:59:59.999 lokal als Date.
  end: Date;
  workouts: WorkoutPoint[];
  totals: {
    count: number;
    totalSets: number;
    totalDurationMin: number;
  };
  // Mo=0 ... So=6 — gefüllt, wenn an dem Tag mindestens ein Workout liegt.
  daysWithWorkout: Set<number>;
  isCurrent: boolean;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Mo–So-Wochenmodell (ISO / de-DE). Sonntag wird als Tag 7 betrachtet, daher
// Montag = Wochenstart. JS-getDay liefert So=0, Mo=1, …, Sa=6.
function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = startOfDay(d);
  start.setDate(start.getDate() - diff);
  return start;
}

export function getCalendarWeek(
  allWorkouts: WorkoutPoint[],
  weekOffset: number,
  now: Date = new Date(),
): CalendarWeek {
  const currentWeekStart = startOfWeekMonday(now);
  const start = new Date(currentWeekStart);
  start.setDate(start.getDate() + weekOffset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(end.getMilliseconds() - 1);

  const startMs = start.getTime();
  const endMs = end.getTime();

  const workouts: WorkoutPoint[] = [];
  const daysWithWorkout = new Set<number>();
  let totalSets = 0;
  let totalDurationMin = 0;

  for (const w of allWorkouts) {
    const t = new Date(w.occurred_at).getTime();
    if (t < startMs || t > endMs) continue;
    workouts.push(w);
    if (w.exercises) {
      for (const ex of w.exercises) totalSets += ex.sets.length;
    }
    totalDurationMin += w.duration_min ?? 0;
    const occurred = new Date(w.occurred_at);
    const day = occurred.getDay();
    daysWithWorkout.add(day === 0 ? 6 : day - 1);
  }

  return {
    weekOffset,
    start,
    end,
    workouts,
    totals: { count: workouts.length, totalSets, totalDurationMin },
    daysWithWorkout,
    isCurrent: weekOffset === 0,
  };
}

// "07.–14. Mai" für Vergangenheits-Wochen.
export function formatWeekRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }).replace('.', '');
  const startStr = start.toLocaleDateString('de-DE', { day: '2-digit' }).replace('.', '');
  return `${startStr}.–${fmt(end)}`;
}

// ISO-8601-Kalenderwoche (Mo–So, KW1 enthält den ersten Donnerstag des Jahres).
export function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
