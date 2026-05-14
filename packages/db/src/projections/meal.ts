import {
  EVENT_CORRECTED,
  EVENT_RETRACTED,
  MEAL_LOGGED,
  eventCorrectedPayloadSchema,
  eventRetractedPayloadSchema,
  mealLoggedPayloadSchema,
} from '@fitness/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MealDataPoint {
  event_id: string;
  occurred_at: Date;
  label: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
  source: string;
  confidence: number | null;
  raw_input: string | null;
  corrected: boolean;
}

export interface MealDayTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
  saturated_fat_g: number;
  salt_g: number;
  count: number;
}

export interface MealProjection {
  today: MealDataPoint[];
  todayTotals: MealDayTotals;
  recent: MealDataPoint[];
}

export interface MealProjectionEventRow {
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

function timestamp(value: string): number {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function compareEventLogOrder(a: MealProjectionEventRow, b: MealProjectionEventRow): number {
  const byRecordedAt = timestamp(a.recorded_at) - timestamp(b.recorded_at);
  if (byRecordedAt !== 0) return byRecordedAt;
  return a.id.localeCompare(b.id);
}

function compareSeriesOrder(a: MealDataPoint, b: MealDataPoint): number {
  const byOccurredAt = a.occurred_at.getTime() - b.occurred_at.getTime();
  if (byOccurredAt !== 0) return byOccurredAt;
  return a.event_id.localeCompare(b.event_id);
}

export function projectMealEvents(
  rows: MealProjectionEventRow[],
  now: Date = new Date(),
): MealProjection {
  type MutablePoint = MealDataPoint & { retracted: boolean };
  type CorrectionFields = {
    label?: string;
    kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    fiber_g?: number;
    saturated_fat_g?: number;
    salt_g?: number;
  };
  type Correction = {
    id: string;
    meal_event_id: string;
    fields: CorrectionFields;
    order: number;
  };

  const pointsById = new Map<string, MutablePoint>();
  const correctionTargetById = new Map<string, string>();
  const correctionsByMealId = new Map<string, Correction[]>();
  const retractedCorrectionIds = new Set<string>();

  const orderedRows = [...rows].sort(compareEventLogOrder);

  for (const [order, row] of orderedRows.entries()) {
    if (row.type === MEAL_LOGGED) {
      const parsed = mealLoggedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      pointsById.set(row.id, {
        event_id: row.id,
        occurred_at: new Date(row.occurred_at),
        label: parsed.data.label,
        kcal: parsed.data.kcal,
        protein_g: parsed.data.protein_g ?? null,
        carbs_g: parsed.data.carbs_g ?? null,
        fat_g: parsed.data.fat_g ?? null,
        sugar_g: parsed.data.sugar_g ?? null,
        fiber_g: parsed.data.fiber_g ?? null,
        saturated_fat_g: parsed.data.saturated_fat_g ?? null,
        salt_g: parsed.data.salt_g ?? null,
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
      const mealEventId = pointsById.has(targetId) ? targetId : correctionTargetById.get(targetId);
      if (!mealEventId) continue;

      const np = parsed.data.new_payload;
      const fields: CorrectionFields = {};
      if (typeof np.label === 'string') fields.label = np.label;
      if (typeof np.kcal === 'number') fields.kcal = np.kcal;
      if (typeof np.protein_g === 'number') fields.protein_g = np.protein_g;
      if (typeof np.carbs_g === 'number') fields.carbs_g = np.carbs_g;
      if (typeof np.fat_g === 'number') fields.fat_g = np.fat_g;
      if (typeof np.sugar_g === 'number') fields.sugar_g = np.sugar_g;
      if (typeof np.fiber_g === 'number') fields.fiber_g = np.fiber_g;
      if (typeof np.saturated_fat_g === 'number') fields.saturated_fat_g = np.saturated_fat_g;
      if (typeof np.salt_g === 'number') fields.salt_g = np.salt_g;

      if (Object.keys(fields).length === 0) continue;

      correctionTargetById.set(row.id, mealEventId);
      const list = correctionsByMealId.get(mealEventId) ?? [];
      list.push({ id: row.id, meal_event_id: mealEventId, fields, order });
      correctionsByMealId.set(mealEventId, list);
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

  for (const [mealEventId, corrections] of correctionsByMealId) {
    const point = pointsById.get(mealEventId);
    if (!point) continue;
    const sorted = [...corrections].sort((a, b) => a.order - b.order);
    let anyApplied = false;
    for (const correction of sorted) {
      if (retractedCorrectionIds.has(correction.id)) continue;
      if (correction.fields.label !== undefined) point.label = correction.fields.label;
      if (correction.fields.kcal !== undefined) point.kcal = correction.fields.kcal;
      if (correction.fields.protein_g !== undefined) point.protein_g = correction.fields.protein_g;
      if (correction.fields.carbs_g !== undefined) point.carbs_g = correction.fields.carbs_g;
      if (correction.fields.fat_g !== undefined) point.fat_g = correction.fields.fat_g;
      if (correction.fields.sugar_g !== undefined) point.sugar_g = correction.fields.sugar_g;
      if (correction.fields.fiber_g !== undefined) point.fiber_g = correction.fields.fiber_g;
      if (correction.fields.saturated_fat_g !== undefined)
        point.saturated_fat_g = correction.fields.saturated_fat_g;
      if (correction.fields.salt_g !== undefined) point.salt_g = correction.fields.salt_g;
      anyApplied = true;
    }
    if (anyApplied) point.corrected = true;
  }

  const all: MealDataPoint[] = [];
  for (const point of pointsById.values()) {
    if (point.retracted) continue;
    all.push({
      event_id: point.event_id,
      occurred_at: point.occurred_at,
      label: point.label,
      kcal: point.kcal,
      protein_g: point.protein_g,
      carbs_g: point.carbs_g,
      fat_g: point.fat_g,
      sugar_g: point.sugar_g,
      fiber_g: point.fiber_g,
      saturated_fat_g: point.saturated_fat_g,
      salt_g: point.salt_g,
      source: point.source,
      confidence: point.confidence,
      raw_input: point.raw_input,
      corrected: point.corrected,
    });
  }
  all.sort(compareSeriesOrder);

  const dayStart = startOfLocalDay(now).getTime();
  const today = all.filter((m) => m.occurred_at.getTime() >= dayStart);

  const todayTotals = today.reduce<MealDayTotals>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein_g: acc.protein_g + (m.protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
      fat_g: acc.fat_g + (m.fat_g ?? 0),
      sugar_g: acc.sugar_g + (m.sugar_g ?? 0),
      fiber_g: acc.fiber_g + (m.fiber_g ?? 0),
      saturated_fat_g: acc.saturated_fat_g + (m.saturated_fat_g ?? 0),
      salt_g: acc.salt_g + (m.salt_g ?? 0),
      count: acc.count + 1,
    }),
    {
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      sugar_g: 0,
      fiber_g: 0,
      saturated_fat_g: 0,
      salt_g: 0,
      count: 0,
    },
  );

  const recent = all.slice(-20).reverse();

  return { today, todayTotals, recent };
}

export async function getMealProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<MealProjection> {
  const { data, error } = await client
    .from('events')
    .select('id, type, occurred_at, recorded_at, source, confidence, raw_input, payload')
    .eq('user_id', userId)
    .in('type', [MEAL_LOGGED, EVENT_CORRECTED, EVENT_RETRACTED])
    .order('recorded_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(`getMealProjection failed: ${error.message}`);

  return projectMealEvents((data ?? []) as MealProjectionEventRow[], now);
}
