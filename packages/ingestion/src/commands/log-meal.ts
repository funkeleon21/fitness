import {
  type EventSource,
  type MealItem,
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
  items?: MealItem[];
  template_id?: string;
  occurred_at: Date;
  source?: EventSource;
  raw_input?: string | null;
  confidence?: number | null;
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
    items: input.items,
    template_id: input.template_id,
    occurred_at: input.occurred_at,
    source: input.source ?? 'manual',
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
  });

  const parsed = mealLoggedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltiges Mahlzeit-Event: ${parsed.error.message}`);
  }

  await appendEvent(client, parsed.data);
  return { event_id: event.id };
}
