import {
  type EventProvenance,
  type EventSource,
  type NutritionTargetsSetPayload,
  createNutritionTargetsSet,
  nutritionTargetsSetEventSchema,
} from '@fitness/core';
import { appendEvent } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SetNutritionTargetsInput {
  user_id: string;
  payload: NutritionTargetsSetPayload;
  occurred_at?: Date;
  source?: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export async function setNutritionTargets(
  client: SupabaseClient,
  input: SetNutritionTargetsInput,
): Promise<{ event_id: string }> {
  const event = createNutritionTargetsSet({
    user_id: input.user_id,
    payload: input.payload,
    occurred_at: input.occurred_at,
    source: input.source ?? 'manual',
    external_id: input.external_id ?? null,
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
    provenance: input.provenance ?? null,
  });

  const parsed = nutritionTargetsSetEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltiges Nutrition-Targets-Event: ${parsed.error.message}`);
  }

  return appendEvent(client, parsed.data);
}
