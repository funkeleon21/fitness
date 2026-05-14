import {
  type EventProvenance,
  type EventSource,
  type MealItem,
  type MealType,
  createMealLogged,
  mealLoggedEventSchema,
} from '@fitness/core';
import { appendEvent } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LogMealInput {
  user_id: string;
  label: string;
  kcal: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  saturated_fat_g?: number;
  salt_g?: number;
  items?: MealItem[];
  template_id?: string;
  meal_type?: MealType;
  occurred_at: Date;
  source?: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export async function logMeal(
  client: SupabaseClient,
  input: LogMealInput,
): Promise<{ event_id: string }> {
  const event = createMealLogged({
    user_id: input.user_id,
    label: input.label,
    kcal: input.kcal,
    protein_g: input.protein_g,
    carbs_g: input.carbs_g,
    fat_g: input.fat_g,
    sugar_g: input.sugar_g,
    fiber_g: input.fiber_g,
    saturated_fat_g: input.saturated_fat_g,
    salt_g: input.salt_g,
    items: input.items,
    template_id: input.template_id,
    meal_type: input.meal_type,
    occurred_at: input.occurred_at,
    source: input.source ?? 'manual',
    external_id: input.external_id ?? null,
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
    provenance: input.provenance ?? null,
  });

  const parsed = mealLoggedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltiges Mahlzeit-Event: ${parsed.error.message}`);
  }

  return appendEvent(client, parsed.data);
}
