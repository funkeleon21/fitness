import { type EventSource, createWeightLogged, weightLoggedEventSchema } from '@fitness/core';
import { appendEvent } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LogWeightInput {
  user_id: string;
  kg: number;
  occurred_at: Date;
  source?: EventSource;
  raw_input?: string | null;
  confidence?: number | null;
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
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
  });

  const parsed = weightLoggedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltiges Gewichts-Event: ${parsed.error.message}`);
  }

  await appendEvent(client, parsed.data);
  return { event_id: event.id };
}
