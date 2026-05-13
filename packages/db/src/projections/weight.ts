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

export interface WeightProjectionEventRow {
  id: string;
  type: string;
  occurred_at: string;
  recorded_at: string;
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

function timestamp(value: string): number {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function compareEventLogOrder(a: WeightProjectionEventRow, b: WeightProjectionEventRow): number {
  const byRecordedAt = timestamp(a.recorded_at) - timestamp(b.recorded_at);
  if (byRecordedAt !== 0) return byRecordedAt;
  return a.id.localeCompare(b.id);
}

function compareSeriesOrder(a: WeightDataPoint, b: WeightDataPoint): number {
  const byOccurredAt = a.occurred_at.getTime() - b.occurred_at.getTime();
  if (byOccurredAt !== 0) return byOccurredAt;
  return a.event_id.localeCompare(b.event_id);
}

export function projectWeightEvents(
  rows: WeightProjectionEventRow[],
  now: Date = new Date(),
): WeightProjection {
  type MutablePoint = WeightDataPoint & { retracted: boolean };
  type Correction = {
    id: string;
    weight_event_id: string;
    kg: number;
    order: number;
  };

  const pointsById = new Map<string, MutablePoint>();
  const correctionTargetById = new Map<string, string>();
  const corrections: Correction[] = [];
  const retractedCorrectionIds = new Set<string>();

  const orderedRows = [...rows].sort(compareEventLogOrder);

  for (const [order, row] of orderedRows.entries()) {
    if (row.type === WEIGHT_LOGGED) {
      const parsed = weightLoggedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      pointsById.set(row.id, {
        event_id: row.id,
        occurred_at: new Date(row.occurred_at),
        kg: parsed.data.kg,
        source: row.source,
        confidence: row.confidence,
        raw_input: row.raw_input,
        corrected: false,
        retracted: false,
      });
      continue;
    }

    if (row.type === EVENT_CORRECTED) {
      const parsed = eventCorrectedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const targetId = parsed.data.corrects_event_id;
      const weightEventId = pointsById.has(targetId)
        ? targetId
        : correctionTargetById.get(targetId);
      if (!weightEventId) continue;

      const newKg = parsed.data.new_payload.kg;
      if (typeof newKg !== 'number') continue;

      correctionTargetById.set(row.id, weightEventId);
      corrections.push({
        id: row.id,
        weight_event_id: weightEventId,
        kg: newKg,
        order,
      });
      continue;
    }

    if (row.type === EVENT_RETRACTED) {
      const parsed = eventRetractedPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const targetId = parsed.data.retracts_event_id;

      const point = pointsById.get(targetId);
      if (point) {
        point.retracted = true;
        continue;
      }

      if (correctionTargetById.has(targetId)) {
        retractedCorrectionIds.add(targetId);
      }
    }
  }

  const activeCorrectionsByWeightId = new Map<string, Correction>();
  for (const correction of corrections) {
    if (retractedCorrectionIds.has(correction.id)) continue;
    const current = activeCorrectionsByWeightId.get(correction.weight_event_id);
    if (!current || correction.order > current.order) {
      activeCorrectionsByWeightId.set(correction.weight_event_id, correction);
    }
  }

  for (const [weightEventId, correction] of activeCorrectionsByWeightId) {
    const point = pointsById.get(weightEventId);
    if (!point) continue;
    point.kg = correction.kg;
    point.corrected = true;
  }

  const series: WeightDataPoint[] = [];
  for (const point of pointsById.values()) {
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
  series.sort(compareSeriesOrder);

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

export async function getWeightProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WeightProjection> {
  const { data, error } = await client
    .from('events')
    .select('id, type, occurred_at, recorded_at, source, confidence, raw_input, payload')
    .eq('user_id', userId)
    .in('type', [WEIGHT_LOGGED, EVENT_CORRECTED, EVENT_RETRACTED])
    .order('recorded_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(`getWeightProjection failed: ${error.message}`);

  return projectWeightEvents((data ?? []) as WeightProjectionEventRow[], now);
}
