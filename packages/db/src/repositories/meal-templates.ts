import type { SupabaseClient } from '@supabase/supabase-js';

export interface MealTemplate {
  id: string;
  user_id: string;
  label: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
  usage_count: number;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMealTemplateInput {
  user_id: string;
  label: string;
  kcal: number;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  sugar_g?: number | null;
  fiber_g?: number | null;
  saturated_fat_g?: number | null;
  salt_g?: number | null;
}

export interface UpdateMealTemplateInput {
  label?: string;
  kcal?: number;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  sugar_g?: number | null;
  fiber_g?: number | null;
  saturated_fat_g?: number | null;
  salt_g?: number | null;
}

interface MealTemplateRow {
  id: string;
  user_id: string;
  label: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTemplate(row: MealTemplateRow): MealTemplate {
  return {
    id: row.id,
    user_id: row.user_id,
    label: row.label,
    kcal: row.kcal,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
    sugar_g: row.sugar_g,
    fiber_g: row.fiber_g,
    saturated_fat_g: row.saturated_fat_g,
    salt_g: row.salt_g,
    usage_count: row.usage_count,
    last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export async function listMealTemplates(
  client: SupabaseClient,
  userId: string,
): Promise<MealTemplate[]> {
  const { data, error } = await client
    .from('meal_templates')
    .select('*')
    .eq('user_id', userId)
    .order('usage_count', { ascending: false })
    .order('label', { ascending: true });

  if (error) throw new Error(`listMealTemplates failed: ${error.message}`);
  return (data as MealTemplateRow[] | null)?.map(rowToTemplate) ?? [];
}

export async function getMealTemplate(
  client: SupabaseClient,
  userId: string,
  id: string,
): Promise<MealTemplate | null> {
  const { data, error } = await client
    .from('meal_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getMealTemplate failed: ${error.message}`);
  return data ? rowToTemplate(data as MealTemplateRow) : null;
}

export async function createMealTemplate(
  client: SupabaseClient,
  input: CreateMealTemplateInput,
): Promise<MealTemplate> {
  const { data, error } = await client
    .from('meal_templates')
    .insert({
      user_id: input.user_id,
      label: input.label,
      kcal: input.kcal,
      protein_g: input.protein_g ?? null,
      carbs_g: input.carbs_g ?? null,
      fat_g: input.fat_g ?? null,
      sugar_g: input.sugar_g ?? null,
      fiber_g: input.fiber_g ?? null,
      saturated_fat_g: input.saturated_fat_g ?? null,
      salt_g: input.salt_g ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`createMealTemplate failed: ${error.message}`);
  return rowToTemplate(data as MealTemplateRow);
}

export async function updateMealTemplate(
  client: SupabaseClient,
  userId: string,
  id: string,
  input: UpdateMealTemplateInput,
): Promise<MealTemplate> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) patch.label = input.label;
  if (input.kcal !== undefined) patch.kcal = input.kcal;
  if (input.protein_g !== undefined) patch.protein_g = input.protein_g;
  if (input.carbs_g !== undefined) patch.carbs_g = input.carbs_g;
  if (input.fat_g !== undefined) patch.fat_g = input.fat_g;
  if (input.sugar_g !== undefined) patch.sugar_g = input.sugar_g;
  if (input.fiber_g !== undefined) patch.fiber_g = input.fiber_g;
  if (input.saturated_fat_g !== undefined) patch.saturated_fat_g = input.saturated_fat_g;
  if (input.salt_g !== undefined) patch.salt_g = input.salt_g;

  const { data, error } = await client
    .from('meal_templates')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`updateMealTemplate failed: ${error.message}`);
  return rowToTemplate(data as MealTemplateRow);
}

export async function deleteMealTemplate(
  client: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await client.from('meal_templates').delete().eq('user_id', userId).eq('id', id);

  if (error) throw new Error(`deleteMealTemplate failed: ${error.message}`);
}

export async function recordMealTemplateUsage(
  client: SupabaseClient,
  userId: string,
  id: string,
  occurredAt: Date,
): Promise<void> {
  const tpl = await getMealTemplate(client, userId, id);
  if (!tpl) return;
  const { error } = await client
    .from('meal_templates')
    .update({
      usage_count: tpl.usage_count + 1,
      last_used_at: occurredAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new Error(`recordMealTemplateUsage failed: ${error.message}`);
}
