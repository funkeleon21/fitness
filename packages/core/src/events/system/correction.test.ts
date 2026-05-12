import { describe, expect, it } from 'vitest';
import {
  EVENT_CORRECTED,
  EVENT_RETRACTED,
  eventCorrectedEventSchema,
  eventRetractedEventSchema,
} from './correction.js';

const baseEnvelope = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  version: 1,
  occurred_at: new Date('2026-05-12T07:00:00Z'),
  recorded_at: new Date('2026-05-12T07:00:00Z'),
  source: 'manual' as const,
  confidence: null,
  raw_input: null,
};

describe('eventCorrectedEventSchema', () => {
  it('accepts a correction with new payload', () => {
    const result = eventCorrectedEventSchema.safeParse({
      ...baseEnvelope,
      type: EVENT_CORRECTED,
      payload: {
        corrects_event_id: '33333333-3333-3333-3333-333333333333',
        reason: 'Tippfehler',
        new_payload: { kg: 84.5 },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty reason string', () => {
    const result = eventCorrectedEventSchema.safeParse({
      ...baseEnvelope,
      type: EVENT_CORRECTED,
      payload: {
        corrects_event_id: '33333333-3333-3333-3333-333333333333',
        reason: '',
        new_payload: { kg: 84.5 },
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('eventRetractedEventSchema', () => {
  it('accepts a retraction with reason', () => {
    const result = eventRetractedEventSchema.safeParse({
      ...baseEnvelope,
      type: EVENT_RETRACTED,
      payload: {
        retracts_event_id: '33333333-3333-3333-3333-333333333333',
        reason: 'Falsch eingegeben',
      },
    });
    expect(result.success).toBe(true);
  });
});
