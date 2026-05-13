import type { EventEnvelope } from '@fitness/core';
import type { SupabaseClient } from '@supabase/supabase-js';

type AnyDomainEvent = EventEnvelope & { payload: Record<string, unknown> };

interface AppendEventResult {
  event_id: string;
  inserted: boolean;
}

function serializeEvent(event: AnyDomainEvent): Record<string, unknown> {
  return {
    id: event.id,
    user_id: event.user_id,
    type: event.type,
    version: event.version,
    occurred_at: event.occurred_at.toISOString(),
    recorded_at: event.recorded_at.toISOString(),
    source: event.source,
    external_id: event.external_id,
    confidence: event.confidence,
    raw_input: event.raw_input,
    provenance: event.provenance,
    payload: event.payload,
  };
}

export async function appendEvent(
  client: SupabaseClient,
  event: AnyDomainEvent,
): Promise<AppendEventResult> {
  const { data, error } = await client
    .from('events')
    .insert(serializeEvent(event))
    .select('id')
    .single();

  if (!error) {
    const id = typeof data?.id === 'string' ? data.id : event.id;
    return { event_id: id, inserted: true };
  }

  if (error.code === '23505' && event.external_id !== null) {
    const { data: existing, error: existingError } = await client
      .from('events')
      .select('id')
      .eq('user_id', event.user_id)
      .eq('source', event.source)
      .eq('external_id', event.external_id)
      .maybeSingle();

    if (!existingError && typeof existing?.id === 'string') {
      return { event_id: existing.id, inserted: false };
    }
  }

  throw new Error(`appendEvent failed: ${error.message}`);
}
