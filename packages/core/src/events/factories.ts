import { WEIGHT_LOGGED, type WeightLoggedEvent } from './body/weight';
import type { EventSource } from './envelope';
import {
  EVENT_CORRECTED,
  EVENT_RETRACTED,
  type EventCorrectedEvent,
  type EventRetractedEvent,
} from './system/correction';

export interface NewWeightLoggedInput {
  user_id: string;
  kg: number;
  occurred_at: Date;
  source: EventSource;
  raw_input?: string | null;
  confidence?: number | null;
}

export function createWeightLogged(input: NewWeightLoggedInput): WeightLoggedEvent {
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: WEIGHT_LOGGED,
    version: 1,
    occurred_at: input.occurred_at,
    recorded_at: new Date(),
    source: input.source,
    confidence: input.confidence ?? null,
    raw_input: input.raw_input ?? null,
    payload: { kg: input.kg },
  };
}

export interface NewEventCorrectedInput {
  user_id: string;
  corrects_event_id: string;
  new_payload: Record<string, unknown>;
  reason: string | null;
  source: EventSource;
  occurred_at?: Date;
}

export function createEventCorrected(input: NewEventCorrectedInput): EventCorrectedEvent {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: EVENT_CORRECTED,
    version: 1,
    occurred_at: input.occurred_at ?? now,
    recorded_at: now,
    source: input.source,
    confidence: null,
    raw_input: null,
    payload: {
      corrects_event_id: input.corrects_event_id,
      new_payload: input.new_payload,
      reason: input.reason,
    },
  };
}

export interface NewEventRetractedInput {
  user_id: string;
  retracts_event_id: string;
  reason: string | null;
  source: EventSource;
  occurred_at?: Date;
}

export function createEventRetracted(input: NewEventRetractedInput): EventRetractedEvent {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    type: EVENT_RETRACTED,
    version: 1,
    occurred_at: input.occurred_at ?? now,
    recorded_at: now,
    source: input.source,
    confidence: null,
    raw_input: null,
    payload: {
      retracts_event_id: input.retracts_event_id,
      reason: input.reason,
    },
  };
}
