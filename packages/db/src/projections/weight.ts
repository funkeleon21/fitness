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

export interface WeightSeriesProjectionRow {
  event_id: string;
  occurred_at: string;
  kg: number;
  source: string;
  confidence: number | null;
  raw_input: string | null;
  corrected: boolean;
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

function buildWeightProjection(
  unsortedSeries: WeightDataPoint[],
  now: Date = new Date(),
): WeightProjection {
  const series = [...unsortedSeries].sort(compareSeriesOrder);
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

function pointFromWeightSeriesRow(row: WeightSeriesProjectionRow): WeightDataPoint {
  return {
    event_id: row.event_id,
    occurred_at: new Date(row.occurred_at),
    kg: row.kg,
    source: row.source,
    confidence: row.confidence,
    raw_input: row.raw_input,
    corrected: row.corrected,
  };
}

export function projectWeightSeriesRows(
  rows: WeightSeriesProjectionRow[],
  now: Date = new Date(),
): WeightProjection {
  return buildWeightProjection(rows.map(pointFromWeightSeriesRow), now);
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

  return buildWeightProjection(series, now);
}

function isMissingProjectionTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.message?.includes('weight_series') === true ||
    error.message?.includes('body_state') === true
  );
}

async function readMaterializedWeightProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WeightProjection | null> {
  const { data, error } = await client
    .from('weight_series')
    .select('event_id, occurred_at, kg, source, confidence, raw_input, corrected')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: true })
    .order('event_id', { ascending: true });

  if (error) {
    if (isMissingProjectionTableError(error)) return null;
    throw new Error(`readMaterializedWeightProjection failed: ${error.message}`);
  }

  const rows = (data ?? []) as WeightSeriesProjectionRow[];
  if (rows.length === 0) return null;
  return projectWeightSeriesRows(rows, now);
}

async function fetchWeightProjectionEventRows(
  client: SupabaseClient,
  userId: string,
): Promise<WeightProjectionEventRow[]> {
  const { data, error } = await client
    .from('events')
    .select('id, type, occurred_at, recorded_at, source, confidence, raw_input, payload')
    .eq('user_id', userId)
    .in('type', [WEIGHT_LOGGED, EVENT_CORRECTED, EVENT_RETRACTED])
    .order('recorded_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(`getWeightProjection failed: ${error.message}`);

  return (data ?? []) as WeightProjectionEventRow[];
}

async function writeMaterializedWeightProjection(
  client: SupabaseClient,
  userId: string,
  projection: WeightProjection,
): Promise<void> {
  const rebuiltAt = new Date().toISOString();

  const { error: deleteSeriesError } = await client
    .from('weight_series')
    .delete()
    .eq('user_id', userId);
  if (deleteSeriesError) {
    throw new Error(`clear weight_series failed: ${deleteSeriesError.message}`);
  }

  if (projection.series.length > 0) {
    const { error: insertSeriesError } = await client.from('weight_series').insert(
      projection.series.map((point) => ({
        user_id: userId,
        event_id: point.event_id,
        occurred_at: point.occurred_at.toISOString(),
        kg: point.kg,
        source: point.source,
        confidence: point.confidence,
        raw_input: point.raw_input,
        corrected: point.corrected,
        rebuilt_at: rebuiltAt,
      })),
    );
    if (insertSeriesError) {
      throw new Error(`insert weight_series failed: ${insertSeriesError.message}`);
    }
  }

  const latest = projection.latest;
  const { error: upsertStateError } = await client.from('body_state').upsert(
    {
      user_id: userId,
      latest_event_id: latest?.event_id ?? null,
      latest_occurred_at: latest?.occurred_at.toISOString() ?? null,
      latest_weight_kg: latest?.kg ?? null,
      trend7d_kg: projection.trend7d,
      trend14d_kg: projection.trend14d,
      trend7d_change_kg: projection.trend7dChangeKg,
      weight_entry_count: projection.series.length,
      rebuilt_at: rebuiltAt,
    },
    { onConflict: 'user_id' },
  );
  if (upsertStateError) {
    throw new Error(`upsert body_state failed: ${upsertStateError.message}`);
  }
}

export async function refreshWeightProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WeightProjection> {
  const rows = await fetchWeightProjectionEventRows(client, userId);
  const projection = projectWeightEvents(rows, now);
  try {
    await writeMaterializedWeightProjection(client, userId, projection);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('weight_series') || err.message.includes('body_state'))
    ) {
      return projection;
    }
    throw err;
  }
  return projection;
}

export async function getWeightProjection(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WeightProjection> {
  const materialized = await readMaterializedWeightProjection(client, userId, now);
  if (materialized) return materialized;
  return refreshWeightProjection(client, userId, now);
}
