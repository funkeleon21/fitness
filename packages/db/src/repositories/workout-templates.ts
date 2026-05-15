import { type WorkoutExercise, workoutExerciseSchema } from '@fitness/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  label: string;
  exercises: WorkoutExercise[];
  default_duration_min: number | null;
  usage_count: number;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWorkoutTemplateInput {
  user_id: string;
  label: string;
  exercises?: WorkoutExercise[];
  default_duration_min?: number | null;
}

export interface UpdateWorkoutTemplateInput {
  label?: string;
  exercises?: WorkoutExercise[];
  default_duration_min?: number | null;
}

interface WorkoutTemplateRow {
  id: string;
  user_id: string;
  label: string;
  exercises: unknown;
  default_duration_min: number | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// JSONB-Spalte → typsicheres Array. Invalides Item → übersprungen, das Template
// bleibt aber lesbar (defensive: lieber unvollständig als gar nicht).
function parseExercises(raw: unknown): WorkoutExercise[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkoutExercise[] = [];
  for (const item of raw) {
    const parsed = workoutExerciseSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function rowToTemplate(row: WorkoutTemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    user_id: row.user_id,
    label: row.label,
    exercises: parseExercises(row.exercises),
    default_duration_min: row.default_duration_min,
    usage_count: row.usage_count,
    last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

export async function listWorkoutTemplates(
  client: SupabaseClient,
  userId: string,
): Promise<WorkoutTemplate[]> {
  const { data, error } = await client
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('usage_count', { ascending: false })
    .order('label', { ascending: true });

  if (error) throw new Error(`listWorkoutTemplates failed: ${error.message}`);
  return (data as WorkoutTemplateRow[] | null)?.map(rowToTemplate) ?? [];
}

export async function getWorkoutTemplate(
  client: SupabaseClient,
  userId: string,
  id: string,
): Promise<WorkoutTemplate | null> {
  const { data, error } = await client
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getWorkoutTemplate failed: ${error.message}`);
  return data ? rowToTemplate(data as WorkoutTemplateRow) : null;
}

export async function createWorkoutTemplate(
  client: SupabaseClient,
  input: CreateWorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const { data, error } = await client
    .from('workout_templates')
    .insert({
      user_id: input.user_id,
      label: input.label,
      exercises: input.exercises ?? [],
      default_duration_min: input.default_duration_min ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`createWorkoutTemplate failed: ${error.message}`);
  return rowToTemplate(data as WorkoutTemplateRow);
}

export async function updateWorkoutTemplate(
  client: SupabaseClient,
  userId: string,
  id: string,
  input: UpdateWorkoutTemplateInput,
): Promise<WorkoutTemplate> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) patch.label = input.label;
  if (input.exercises !== undefined) patch.exercises = input.exercises;
  if (input.default_duration_min !== undefined)
    patch.default_duration_min = input.default_duration_min;

  const { data, error } = await client
    .from('workout_templates')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`updateWorkoutTemplate failed: ${error.message}`);
  return rowToTemplate(data as WorkoutTemplateRow);
}

export async function deleteWorkoutTemplate(
  client: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('workout_templates')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new Error(`deleteWorkoutTemplate failed: ${error.message}`);
}

export async function recordWorkoutTemplateUsage(
  client: SupabaseClient,
  userId: string,
  id: string,
  occurredAt: Date,
): Promise<void> {
  const tpl = await getWorkoutTemplate(client, userId, id);
  if (!tpl) return;
  const { error } = await client
    .from('workout_templates')
    .update({
      usage_count: tpl.usage_count + 1,
      last_used_at: occurredAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new Error(`recordWorkoutTemplateUsage failed: ${error.message}`);
}
