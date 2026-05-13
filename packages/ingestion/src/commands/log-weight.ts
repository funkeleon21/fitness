import {
  type EventProvenance,
  type EventSource,
  createWeightLogged,
  weightLoggedEventSchema,
} from '@fitness/core';
import { appendEvent, refreshWeightProjection } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LogWeightInput {
  user_id: string;
  kg: number;
  occurred_at: Date;
  source?: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export async function logWeight(
  client: SupabaseClient,
  input: LogWeightInput,
): Promise<{ event_id: string }> {
  const event = createWeightLogged({
    user_id: input.user_id,
    kg: input.kg,
    occurred_at: input.occurred_at,
    source: input.source ?? 'manual',
    external_id: input.external_id ?? null,
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
    provenance: input.provenance ?? null,
  });

  const parsed = weightLoggedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltiges Gewichts-Event: ${parsed.error.message}`);
  }

  const result = await appendEvent(client, parsed.data);
  await refreshWeightProjection(client, input.user_id);
  return result;
}
