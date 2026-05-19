import {
  EVENT_CORRECTED,
  EVENT_RETRACTED,
  WORKOUT_LOGGED,
  type WorkoutExercise,
  type WorkoutIcon,
  type WorkoutMood,
  eventCorrectedPayloadSchema,
  eventRetractedPayloadSchema,
  workoutExerciseSchema,
  workoutIconSchema,
  workoutLoggedPayloadSchema,
  workoutMoodSchema,
} from '@fitness/core';
import type { SupabaseClient } from '@supabase/supabase-js';

// Repräsentiert eine geloggte Trainingseinheit, wie sie aus dem Replay
// herauskommt — inkl. ggf. angewendeter Korrektur-Events. retracted-Events
// fliegen schon in der Projection raus, daher kein retracted-Feld hier.
export interface WorkoutDataPoint {
  event_id: string;
  occurred_at: Date;
  label: string;
  duration_min: number | null;
  exercises: WorkoutExercise[] | null;
  mood: WorkoutMood | null;
  note: string | null;
  icon: WorkoutIcon | null;
  template_id: string | null;
  source: string;
  confidence: number | null;
  raw_input: string | null;
  corrected: boolean;
}

// Aggregat über die letzten 7 Tage (inkl. heute) — analog zu MealDayTotals,
// aber ohne kcal/Makros, weil Training andere Größen aggregiert.
export interface WorkoutWeekTotals {
  count: number; // Anzahl Trainingseinheiten
  totalSets: number; // Summe aller Sätze über alle Übungen
  totalDurationMin: number; // Summe der erfassten Dauer
}

export interface WorkoutProjection {
  today: WorkoutDataPoint[];
  thisWeek: WorkoutDataPoint[];
  thisWeekTotals: WorkoutWeekTotals;
  recent: WorkoutDataPoint[];
  // Alle nicht-retracted Workouts des Users, neuste zuerst. Wird vom Training-Tab
  // für die Wochen-Navigation gebraucht: dort werden Mo–So-Aggregate clientseitig
  // aus dieser Liste berechnet, abhängig von der gewählten Woche. `recent` bleibt
  // davon unberührt (gecapped auf 20, weiter Quelle für Chat-Tools).
  allWorkouts: WorkoutDataPoint[];
}

export interface WorkoutProjectionEventRow {
  id: string;
  type: string;
  occurred_at: string;
  recorded_at: string;
  source: string;
  confidence: number | null;
  raw_input: string | null;
  payload: unknown;
}

function startOfLocalDay(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekWindow(now: Date): Date {
  // 7-Tage-Fenster zurück, inklusive heute. Bewusst kein "Montag bis Sonntag"-
  // Kalendermodell — das wäre nur für Wochenstatistik-Reporting nötig, hier
  // genügt das Sliding Window für den Empty-/Status-Block auf der UI.
  const d = startOfLocalDay(now);
  d.setDate(d.getDate() - 6);
  return d;
}

function timestamp(value: string): number {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function compareEventLogOrder(a: WorkoutProjectionEventRow, b: WorkoutProjectionEventRow): number {
  const byRecordedAt = timestamp(a.recorded_at) - timestamp(b.recorded_at);
  if (byRecordedAt !== 0) return byRecordedAt;
  return a.id.localeCompare(b.id);
}

function compareSeriesOrder(a: WorkoutDataPoint, b: WorkoutDataPoint): number {
  const byOccurredAt = a.occurred_at.getTime() - b.occurred_at.getTime();
  if (byOccurredAt !== 0) return byOccurredAt;
  return a.event_id.localeCompare(b.event_id);
}

function countSets(exercises: WorkoutExercise[] | null): number {
  if (!exercises) return 0;
  return exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
}

export function projectWorkoutEvents(
  rows: WorkoutProjectionEventRow[],
  now: Date = new Date(),
): WorkoutProjection {
  type MutablePoint = WorkoutDataPoint & { retracted: boolean };
  type CorrectionFields = {
    label?: string;
    duration_min?: number;
    exercises?: WorkoutExercise[];
    // mood/note dürfen via Correction explizit auf null zurückgesetzt werden — der
    // Nutzer kann eine versehentlich gewählte Stimmung oder Notiz wieder entfernen.
    mood?: WorkoutMood | null;
    note?: string | null;
    icon?: WorkoutIcon | null;
  };
  type Correction = {
    id: string;
    workout_event_id: string;
    fields: CorrectionFields;
    order: number;
  };

  // exercises ist kein Skalar — Korrekturen am Übungsarray werden komplett
  // (als ganzes neues Array) übergeben. Partial-Edits einzelner Sätze macht
  // die UI clientseitig, schreibt aber das gesamte Array ins Correction-Event.
  // Validierung erfolgt pro Element via workoutExerciseSchema, damit wir hier
  // keinen z-Import in packages/db einführen müssen.
  function parseExercisesArray(input: unknown): WorkoutExercise[] | null {
    if (!Array.isArray(input)) return null;
    if (input.length > 30) return null;
    const out: WorkoutExercise[] = [];
    for (const item of input) {
      const parsed = workoutExerciseSchema.safeParse(item);
      if (!parsed.success) return null;
      out.push(parsed.data);
    }
    return out;
  }

  const pointsById = new Map<string, MutablePoint>();
  const correctionTargetById = new Map<string, string>();
  const correctionsByWorkoutId = new Map<string, Correction[]>();
  const retractedCorrectionIds = new Set<string>();

  const orderedRows = [...rows].sort(compareEventLogOrder);

  for (const [order, row] of orderedRows.entries()) {
    if (row.type === WORKOUT_LOGGED) {
      const parsed = workoutLoggedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      pointsById.set(row.id, {
        event_id: row.id,
        occurred_at: new Date(row.occurred_at),
        label: parsed.data.label,
        duration_min: parsed.data.duration_min ?? null,
        exercises: parsed.data.exercises ?? null,
        mood: parsed.data.mood ?? null,
        note: parsed.data.note ?? null,
        icon: parsed.data.icon ?? null,
        template_id: parsed.data.template_id ?? null,
        source: row.source,
        confidence: row.confidence,
        raw_input: row.raw_input,
        corrected: false,
        retracted: false,
      });
      continue;
    }

    if (row.type === EVENT_CORRECTED) {
      const parsed = eventCorrectedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const targetId = parsed.data.corrects_event_id;
      const workoutEventId = pointsById.has(targetId)
        ? targetId
        : correctionTargetById.get(targetId);
      if (!workoutEventId) continue;

      const np = parsed.data.new_payload;
      const fields: CorrectionFields = {};
      if (typeof np.label === 'string') fields.label = np.label;
      if (typeof np.duration_min === 'number') fields.duration_min = np.duration_min;
      if (np.exercises !== undefined) {
        const exercisesParsed = parseExercisesArray(np.exercises);
        if (exercisesParsed !== null) fields.exercises = exercisesParsed;
      }
      if (np.mood !== undefined) {
        if (np.mood === null) {
          fields.mood = null;
        } else {
          const moodParsed = workoutMoodSchema.safeParse(np.mood);
          if (moodParsed.success) fields.mood = moodParsed.data;
        }
      }
      if (np.note !== undefined) {
        if (np.note === null) {
          fields.note = null;
        } else if (typeof np.note === 'string' && np.note.length <= 500) {
          fields.note = np.note;
        }
      }
      if (np.icon !== undefined) {
        if (np.icon === null) {
          fields.icon = null;
        } else {
          const iconParsed = workoutIconSchema.safeParse(np.icon);
          if (iconParsed.success) fields.icon = iconParsed.data;
        }
      }

      if (Object.keys(fields).length === 0) continue;

      correctionTargetById.set(row.id, workoutEventId);
      const list = correctionsByWorkoutId.get(workoutEventId) ?? [];
      list.push({ id: row.id, workout_event_id: workoutEventId, fields, order });
      correctionsByWorkoutId.set(workoutEventId, list);
      continue;
    }

    if (row.type === EVENT_RETRACTED) {
      const parsed = eventRetractedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const targetId = parsed.data.retracts_event_id;

      const point = pointsById.get(targetId);
      if (point) {
        point.retracted = true;
        continue;
      }

      if (correctionTargetById.has(targetId)) {
        retractedCorrectionIds.add(targetId);
      }
    }
  }

  for (const [workoutEventId, corrections] of correctionsByWorkoutId) {
    const point = pointsById.get(workoutEventId);
    if (!point) continue;
    const sorted = [...corrections].sort((a, b) => a.order - b.order);
    let anyApplied = false;
    for (const correction of sorted) {
      if (retractedCorrectionIds.has(correction.id)) continue;
      if (correction.fields.label !== undefined) point.label = correction.fields.label;
      if (correction.fields.duration_min !== undefined)
        point.duration_min = correction.fields.duration_min;
      if (correction.fields.exercises !== undefined) point.exercises = correction.fields.exercises;
      if (correction.fields.mood !== undefined) point.mood = correction.fields.mood;
      if (correction.fields.note !== undefined) point.note = correction.fields.note;
      if (correction.fields.icon !== undefined) point.icon = correction.fields.icon;
      anyApplied = true;
    }
    if (anyApplied) point.corrected = true;
  }

  const all: WorkoutDataPoint[] = [];
  for (const point of pointsById.values()) {
    if (point.retracted) continue;
    all.push({
      event_id: point.event_id,
      occurred_at: point.occurred_at,
      label: point.label,
      duration_min: point.duration_min,
      exercises: point.exercises,
      mood: point.mood,
      note: point.note,
      icon: point.icon,
      template_id: point.template_id,
      source: point.source,
      confidence: point.confidence,
      raw_input: point.raw_input,
      corrected: point.corrected,
    });
  }
  all.sort(compareSeriesOrder);

  const dayStart = startOfLocalDay(now).getTime();
  const weekStart = startOfWeekWindow(now).getTime();
  const today = all.filter((w) => w.occurred_at.getTime() >= dayStart);
  const thisWeek = all.filter((w) => w.occurred_at.getTime() >= weekStart);

  const thisWeekTotals = thisWeek.reduce<WorkoutWeekTotals>(
    (acc, w) => ({
      count: acc.count + 1,
      totalSets: acc.totalSets + countSets(w.exercises),
      totalDurationMin: acc.totalDurationMin + (w.duration_min ?? 0),
    }),
    { count: 0, totalSets: 0, totalDurationMin: 0 },
  );

  const newestFirst = [...all].reverse();
  const recent = newestFirst.slice(0, 20);

  return { today, thisWeek, thisWeekTotals, recent, allWorkouts: newestFirst };
}

export async function getWorkoutProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WorkoutProjection> {
  const { data, error } = await client
    .from('events')
    .select('id, type, occurred_at, recorded_at, source, confidence, raw_input, payload')
    .eq('user_id', userId)
    .in('type', [WORKOUT_LOGGED, EVENT_CORRECTED, EVENT_RETRACTED])
    .order('recorded_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(`getWorkoutProjection failed: ${error.message}`);

  return projectWorkoutEvents((data ?? []) as WorkoutProjectionEventRow[], now);
}
