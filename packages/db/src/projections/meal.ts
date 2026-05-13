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
  count: number;
}

export interface MealProjection {
  today: MealDataPoint[];
  todayTotals: MealDayTotals;
  recent: MealDataPoint[];
}

interface RawEventRow {
  id: string;
  type: string;
  occurred_at: string;
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

export async function getMealProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<MealProjection> {
  const { data, error } = await client
    .from('events')
    .select('id, type, occurred_at, source, confidence, raw_input, payload')
    .eq('user_id', userId)
    .in('type', [MEAL_LOGGED, EVENT_CORRECTED, EVENT_RETRACTED])
    .order('occurred_at', { ascending: true });

  if (error) throw new Error(`getMealProjection failed: ${error.message}`);

  const rows = (data ?? []) as RawEventRow[];

  type Mutable = MealDataPoint & { retracted: boolean };
  const byId = new Map<string, Mutable>();

  for (const row of rows) {
    if (row.type === MEAL_LOGGED) {
      const parsed = mealLoggedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      byId.set(row.id, {
        event_id: row.id,
        occurred_at: new Date(row.occurred_at),
        label: parsed.data.label,
        kcal: parsed.data.kcal,
        protein_g: parsed.data.protein_g ?? null,
        carbs_g: parsed.data.carbs_g ?? null,
        fat_g: parsed.data.fat_g ?? null,
        source: row.source,
        confidence: row.confidence,
        raw_input: row.raw_input,
        corrected: false,
        retracted: false,
      });
    } else if (row.type === EVENT_CORRECTED) {
      const parsed = eventCorrectedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const target = byId.get(parsed.data.corrects_event_id);
      if (!target) continue;
      const np = parsed.data.new_payload;
      if (typeof np.label === 'string') target.label = np.label;
      if (typeof np.kcal === 'number') target.kcal = np.kcal;
      if (typeof np.protein_g === 'number') target.protein_g = np.protein_g;
      if (typeof np.carbs_g === 'number') target.carbs_g = np.carbs_g;
      if (typeof np.fat_g === 'number') target.fat_g = np.fat_g;
      target.corrected = true;
    } else if (row.type === EVENT_RETRACTED) {
      const parsed = eventRetractedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const target = byId.get(parsed.data.retracts_event_id);
      if (!target) continue;
      target.retracted = true;
    }
  }

  const all: MealDataPoint[] = [];
  for (const point of byId.values()) {
    if (point.retracted) continue;
    all.push({
      event_id: point.event_id,
      occurred_at: point.occurred_at,
      label: point.label,
      kcal: point.kcal,
      protein_g: point.protein_g,
      carbs_g: point.carbs_g,
      fat_g: point.fat_g,
      source: point.source,
      confidence: point.confidence,
      raw_input: point.raw_input,
      corrected: point.corrected,
    });
  }
  all.sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime());

  const dayStart = startOfLocalDay(now).getTime();
  const today = all.filter((m) => m.occurred_at.getTime() >= dayStart);

  const todayTotals = today.reduce<MealDayTotals>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein_g: acc.protein_g + (m.protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
      fat_g: acc.fat_g + (m.fat_g ?? 0),
      count: acc.count + 1,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 },
  );

  const recent = all.slice(-20).reverse();

  return { today, todayTotals, recent };
}
