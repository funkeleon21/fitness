import { NUTRITION_TARGETS_SET, nutritionTargetsSetPayloadSchema } from '@fitness/core';
import type { SupabaseClient } from '@supabase/supabase-js';

// Field-wise Overlay-Projection: jüngeres Event überschreibt nur die Felder,
// die es explizit setzt. So kann der User "kcal 2300" setzen und später
// "protein_g 180" — beide bleiben aktiv. Keine Korrektur-Events nötig.
export interface NutritionTargetsState {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
}

export interface NutritionTargetsEventRow {
  id: string;
  type: string;
  recorded_at: string;
  payload: unknown;
}

export const EMPTY_NUTRITION_TARGETS: NutritionTargetsState = {
  kcal: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  sugar_g: null,
  fiber_g: null,
  saturated_fat_g: null,
  salt_g: null,
};

function timestamp(value: string): number {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function compareEventLogOrder(a: NutritionTargetsEventRow, b: NutritionTargetsEventRow): number {
  const byRecordedAt = timestamp(a.recorded_at) - timestamp(b.recorded_at);
  if (byRecordedAt !== 0) return byRecordedAt;
  return a.id.localeCompare(b.id);
}

export function projectNutritionTargets(rows: NutritionTargetsEventRow[]): NutritionTargetsState {
  const state: NutritionTargetsState = { ...EMPTY_NUTRITION_TARGETS };
  const ordered = [...rows].sort(compareEventLogOrder);

  for (const row of ordered) {
    if (row.type !== NUTRITION_TARGETS_SET) continue;
    const parsed = nutritionTargetsSetPayloadSchema.safeParse(row.payload);
    if (!parsed.success) continue;
    const p = parsed.data;
    if (p.kcal !== undefined) state.kcal = p.kcal;
    if (p.protein_g !== undefined) state.protein_g = p.protein_g;
    if (p.carbs_g !== undefined) state.carbs_g = p.carbs_g;
    if (p.fat_g !== undefined) state.fat_g = p.fat_g;
    if (p.sugar_g !== undefined) state.sugar_g = p.sugar_g;
    if (p.fiber_g !== undefined) state.fiber_g = p.fiber_g;
    if (p.saturated_fat_g !== undefined) state.saturated_fat_g = p.saturated_fat_g;
    if (p.salt_g !== undefined) state.salt_g = p.salt_g;
  }

  return state;
}

export async function getNutritionTargets(
  client: SupabaseClient,
  userId: string,
): Promise<NutritionTargetsState> {
  const { data, error } = await client
    .from('events')
    .select('id, type, recorded_at, payload')
    .eq('user_id', userId)
    .eq('type', NUTRITION_TARGETS_SET)
    .order('recorded_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(`getNutritionTargets failed: ${error.message}`);

  return projectNutritionTargets((data ?? []) as NutritionTargetsEventRow[]);
}
