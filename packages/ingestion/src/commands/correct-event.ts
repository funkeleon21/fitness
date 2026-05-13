import {
  type EventProvenance,
  type EventSource,
  createEventCorrected,
  createEventRetracted,
  eventCorrectedEventSchema,
  eventRetractedEventSchema,
} from '@fitness/core';
import { appendEvent } from '@fitness/db';
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

  return appendEvent(client, parsed.data);
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

  return appendEvent(client, parsed.data);
}
