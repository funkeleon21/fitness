import {
  EVENT_CORRECTED,
  EVENT_RETRACTED,
  WEIGHT_LOGGED,
  eventCorrectedPayloadSchema,
  eventRetractedPayloadSchema,
  weightLoggedPayloadSchema,
} from '@fitness/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface WeightDataPoint {
  event_id: string;
  occurred_at: Date;
  kg: number;
  source: string;
  confidence: number | null;
  raw_input: string | null;
  corrected: boolean;
}

export interface WeightProjection {
  series: WeightDataPoint[];
  latest: WeightDataPoint | null;
  trend7d: number | null;
  trend14d: number | null;
  trend7dChangeKg: number | null;
}

interface RawEventRow {
  id: string;
  type: string;
  occurred_at: string;
  source: string;
  confidence: number | null;
  raw_input: string | null;
  payload: unknown;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function pointsInWindow(points: WeightDataPoint[], days: number, now: Date): WeightDataPoint[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return points.filter((p) => p.occurred_at.getTime() >= cutoff);
}

export async function getWeightProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WeightProjection> {
  const { data, error } = await client
    .from('events')
    .select('id, type, occurred_at, source, confidence, raw_input, payload')
    .eq('user_id', userId)
    .in('type', [WEIGHT_LOGGED, EVENT_CORRECTED, EVENT_RETRACTED])
    .order('occurred_at', { ascending: true });

  if (error) throw new Error(`getWeightProjection failed: ${error.message}`);

  const rows = (data ?? []) as RawEventRow[];

  // Build a map: weightEventId -> { kg, occurred_at, ..., correctedKg?, retracted? }
  type Mutable = WeightDataPoint & { retracted: boolean };
  const byId = new Map<string, Mutable>();

  for (const row of rows) {
    if (row.type === WEIGHT_LOGGED) {
      const parsed = weightLoggedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      byId.set(row.id, {
        event_id: row.id,
        occurred_at: new Date(row.occurred_at),
        kg: parsed.data.kg,
        source: row.source,
        confidence: row.confidence,
        raw_input: row.raw_input,
        corrected: false,
        retracted: false,
      });
    } else if (row.type === EVENT_CORRECTED) {
      const parsed = eventCorrectedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const target = byId.get(parsed.data.corrects_event_id);
      if (!target) continue;
      const newKg = parsed.data.new_payload.kg;
      if (typeof newKg === 'number') {
        target.kg = newKg;
        target.corrected = true;
      }
    } else if (row.type === EVENT_RETRACTED) {
      const parsed = eventRetractedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const target = byId.get(parsed.data.retracts_event_id);
      if (!target) continue;
      target.retracted = true;
    }
  }

  const series: WeightDataPoint[] = [];
  for (const point of byId.values()) {
    if (point.retracted) continue;
    series.push({
      event_id: point.event_id,
      occurred_at: point.occurred_at,
      kg: point.kg,
      source: point.source,
      confidence: point.confidence,
      raw_input: point.raw_input,
      corrected: point.corrected,
    });
  }
  series.sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime());

  const latest = series.length > 0 ? (series[series.length - 1] ?? null) : null;
  const last7 = pointsInWindow(series, 7, now);
  const last14 = pointsInWindow(series, 14, now);
  const trend7d = average(last7.map((p) => p.kg));
  const trend14d = average(last14.map((p) => p.kg));

  let trend7dChangeKg: number | null = null;
  const prior7 = pointsInWindow(series, 14, now).filter(
    (p) => p.occurred_at.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  const priorAvg = average(prior7.map((p) => p.kg));
  if (trend7d !== null && priorAvg !== null) {
    trend7dChangeKg = trend7d - priorAvg;
  }

  return { series, latest, trend7d, trend14d, trend7dChangeKg };
}
