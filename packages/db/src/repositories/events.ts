import type { EventEnvelope } from '@fitness/core';
import type { SupabaseClient } from '@supabase/supabase-js';

type AnyDomainEvent = EventEnvelope & { payload: Record<string, unknown> };

function serializeEvent(event: AnyDomainEvent): Record<string, unknown> {
  return {
    id: event.id,
    user_id: event.user_id,
    type: event.type,
    version: event.version,
    occurred_at: event.occurred_at.toISOString(),
    recorded_at: event.recorded_at.toISOString(),
    source: event.source,
    confidence: event.confidence,
    raw_input: event.raw_input,
    payload: event.payload,
  };
}

export async function appendEvent(client: SupabaseClient, event: AnyDomainEvent): Promise<void> {
  const { error } = await client.from('events').insert(serializeEvent(event));
  if (error) throw new Error(`appendEvent failed: ${error.message}`);
}
