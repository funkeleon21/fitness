import {
  EVENT_CORRECTED,
  EVENT_RETRACTED,
  type EventProvenance,
  type EventSource,
  WEIGHT_LOGGED,
  createEventCorrected,
  createEventRetracted,
  eventCorrectedEventSchema,
  eventRetractedEventSchema,
} from '@fitness/core';
import { appendEvent, refreshWeightProjection } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CorrectEventInput {
  user_id: string;
  corrects_event_id: string;
  new_payload: Record<string, unknown>;
  reason: string | null;
  source?: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export async function correctEvent(
  client: SupabaseClient,
  input: CorrectEventInput,
): Promise<{ event_id: string }> {
  const event = createEventCorrected({
    user_id: input.user_id,
    corrects_event_id: input.corrects_event_id,
    new_payload: input.new_payload,
    reason: input.reason,
    source: input.source ?? 'manual',
    external_id: input.external_id ?? null,
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
    provenance: input.provenance ?? null,
  });

  const parsed = eventCorrectedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltige Korrektur: ${parsed.error.message}`);
  }

  const result = await appendEvent(client, parsed.data);
  if (await targetsWeightEvent(client, input.corrects_event_id)) {
    await refreshWeightProjection(client, input.user_id);
  }
  return result;
}

export interface RetractEventInput {
  user_id: string;
  retracts_event_id: string;
  reason: string | null;
  source?: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export async function retractEvent(
  client: SupabaseClient,
  input: RetractEventInput,
): Promise<{ event_id: string }> {
  const event = createEventRetracted({
    user_id: input.user_id,
    retracts_event_id: input.retracts_event_id,
    reason: input.reason,
    source: input.source ?? 'manual',
    external_id: input.external_id ?? null,
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
    provenance: input.provenance ?? null,
  });

  const parsed = eventRetractedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltige Retraction: ${parsed.error.message}`);
  }

  const result = await appendEvent(client, parsed.data);
  if (await targetsWeightEvent(client, input.retracts_event_id)) {
    await refreshWeightProjection(client, input.user_id);
  }
  return result;
}

// Korrekturen/Retractions koennen auf weitere Korrekturen zeigen (Korrektur-Kette).
// Wir folgen der Kette bis zum urspruenglichen Domain-Event und pruefen dessen Typ.
// Nur wenn die Wurzel ein weight_logged ist, lohnt sich der Refresh der Weight-Projection.
// Stilles Skip wenn ein Glied der Kette fehlt (z.B. bereits retracted) — kein Throw.
const MAX_CORRECTION_CHAIN_DEPTH = 10;

interface EventLookupRow {
  type: string;
  payload: Record<string, unknown> | null;
}

async function targetsWeightEvent(client: SupabaseClient, eventId: string): Promise<boolean> {
  let currentId: string | null = eventId;
  const visited = new Set<string>();

  for (let depth = 0; depth < MAX_CORRECTION_CHAIN_DEPTH; depth++) {
    if (currentId === null || visited.has(currentId)) return false;
    visited.add(currentId);

    const { data, error } = await client
      .from('events')
      .select('type, payload')
      .eq('id', currentId)
      .maybeSingle<EventLookupRow>();

    if (error || !data) return false;

    if (data.type === WEIGHT_LOGGED) return true;
    if (data.type !== EVENT_CORRECTED && data.type !== EVENT_RETRACTED) return false;

    const payload = data.payload;
    if (!payload) return false;
    const nextId: unknown =
      data.type === EVENT_CORRECTED ? payload.corrects_event_id : payload.retracts_event_id;
    currentId = typeof nextId === 'string' ? nextId : null;
  }

  return false;
}
