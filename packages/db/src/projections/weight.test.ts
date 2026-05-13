import { EVENT_CORRECTED, EVENT_RETRACTED, WEIGHT_LOGGED } from '@fitness/core';
import { describe, expect, it } from 'vitest';
import {
  type WeightProjectionEventRow,
  type WeightSeriesProjectionRow,
  projectWeightEvents,
  projectWeightSeriesRows,
} from './weight';

const WEIGHT_1 = '11111111-1111-1111-1111-111111111111';
const WEIGHT_2 = '22222222-2222-2222-2222-222222222222';
const CORRECTION_1 = '33333333-3333-3333-3333-333333333333';
const CORRECTION_2 = '44444444-4444-4444-4444-444444444444';
const RETRACTION_1 = '55555555-5555-5555-5555-555555555555';

function weightRow(input: {
  id: string;
  kg: number;
  occurred_at: string;
  recorded_at: string;
}): WeightProjectionEventRow {
  return {
    id: input.id,
    type: WEIGHT_LOGGED,
    occurred_at: input.occurred_at,
    recorded_at: input.recorded_at,
    source: 'manual',
    confidence: null,
    raw_input: null,
    payload: { kg: input.kg },
  };
}

function correctionRow(input: {
  id: string;
  target: string;
  kg: number;
  recorded_at: string;
}): WeightProjectionEventRow {
  return {
    id: input.id,
    type: EVENT_CORRECTED,
    occurred_at: input.recorded_at,
    recorded_at: input.recorded_at,
    source: 'manual',
    confidence: null,
    raw_input: null,
    payload: {
      corrects_event_id: input.target,
      reason: 'Tippfehler',
      new_payload: { kg: input.kg },
    },
  };
}

function retractionRow(input: {
  id: string;
  target: string;
  recorded_at: string;
}): WeightProjectionEventRow {
  return {
    id: input.id,
    type: EVENT_RETRACTED,
    occurred_at: input.recorded_at,
    recorded_at: input.recorded_at,
    source: 'manual',
    confidence: null,
    raw_input: null,
    payload: {
      retracts_event_id: input.target,
      reason: 'Doppelte Eingabe',
    },
  };
}

describe('projectWeightEvents', () => {
  it('projects weight series and rolling trends', () => {
    const projection = projectWeightEvents(
      [
        weightRow({
          id: WEIGHT_1,
          kg: 84,
          occurred_at: '2026-05-01T07:00:00.000Z',
          recorded_at: '2026-05-01T07:01:00.000Z',
        }),
        weightRow({
          id: WEIGHT_2,
          kg: 82,
          occurred_at: '2026-05-10T07:00:00.000Z',
          recorded_at: '2026-05-10T07:01:00.000Z',
        }),
      ],
      new Date('2026-05-15T00:00:00.000Z'),
    );

    expect(projection.series.map((p) => p.kg)).toEqual([84, 82]);
    expect(projection.latest?.event_id).toBe(WEIGHT_2);
    expect(projection.trend7d).toBe(82);
    expect(projection.trend14d).toBe(83);
    expect(projection.trend7dChangeKg).toBe(-2);
  });

  it('replays corrections by recorded_at even when input rows are unsorted', () => {
    const projection = projectWeightEvents(
      [
        correctionRow({
          id: CORRECTION_1,
          target: WEIGHT_1,
          kg: 84.4,
          recorded_at: '2026-05-11T08:00:00.000Z',
        }),
        weightRow({
          id: WEIGHT_1,
          kg: 83.4,
          occurred_at: '2026-05-11T07:00:00.000Z',
          recorded_at: '2026-05-11T07:01:00.000Z',
        }),
      ],
      new Date('2026-05-12T00:00:00.000Z'),
    );

    expect(projection.series).toHaveLength(1);
    expect(projection.series[0]?.kg).toBe(84.4);
    expect(projection.series[0]?.corrected).toBe(true);
  });

  it('supports correction chains and retracted corrections', () => {
    const projection = projectWeightEvents(
      [
        weightRow({
          id: WEIGHT_1,
          kg: 83.4,
          occurred_at: '2026-05-11T07:00:00.000Z',
          recorded_at: '2026-05-11T07:01:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_1,
          target: WEIGHT_1,
          kg: 84.4,
          recorded_at: '2026-05-11T08:00:00.000Z',
        }),
        correctionRow({
          id: CORRECTION_2,
          target: CORRECTION_1,
          kg: 84.6,
          recorded_at: '2026-05-11T09:00:00.000Z',
        }),
        retractionRow({
          id: RETRACTION_1,
          target: CORRECTION_2,
          recorded_at: '2026-05-11T10:00:00.000Z',
        }),
      ],
      new Date('2026-05-12T00:00:00.000Z'),
    );

    expect(projection.series).toHaveLength(1);
    expect(projection.series[0]?.kg).toBe(84.4);
    expect(projection.series[0]?.corrected).toBe(true);
  });

  it('removes retracted weight events from the projected series', () => {
    const projection = projectWeightEvents(
      [
        weightRow({
          id: WEIGHT_1,
          kg: 84,
          occurred_at: '2026-05-10T07:00:00.000Z',
          recorded_at: '2026-05-10T07:01:00.000Z',
        }),
        weightRow({
          id: WEIGHT_2,
          kg: 85,
          occurred_at: '2026-05-11T07:00:00.000Z',
          recorded_at: '2026-05-11T07:01:00.000Z',
        }),
        retractionRow({
          id: RETRACTION_1,
          target: WEIGHT_2,
          recorded_at: '2026-05-11T08:00:00.000Z',
        }),
      ],
      new Date('2026-05-12T00:00:00.000Z'),
    );

    expect(projection.series.map((p) => p.event_id)).toEqual([WEIGHT_1]);
    expect(projection.latest?.event_id).toBe(WEIGHT_1);
  });
});

describe('projectWeightSeriesRows', () => {
  it('projects from already materialized weight rows', () => {
    const rows: WeightSeriesProjectionRow[] = [
      {
        event_id: WEIGHT_2,
        occurred_at: '2026-05-10T07:00:00.000Z',
        kg: 82,
        source: 'manual',
        confidence: null,
        raw_input: null,
        corrected: false,
      },
      {
        event_id: WEIGHT_1,
        occurred_at: '2026-05-01T07:00:00.000Z',
        kg: 84.4,
        source: 'manual',
        confidence: null,
        raw_input: null,
        corrected: true,
      },
    ];

    const projection = projectWeightSeriesRows(rows, new Date('2026-05-15T00:00:00.000Z'));

    expect(projection.series.map((p) => p.event_id)).toEqual([WEIGHT_1, WEIGHT_2]);
    expect(projection.latest?.event_id).toBe(WEIGHT_2);
    expect(projection.trend7d).toBe(82);
    expect(projection.trend14d).toBe(83.2);
    expect(projection.series[0]?.corrected).toBe(true);
  });
});
