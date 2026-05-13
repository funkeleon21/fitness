'use server';

import { createClient } from '@/lib/supabase/server';
import { correctEvent, logMeal, logWeight, retractEvent } from '@fitness/ingestion';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function parseKg(raw: FormDataEntryValue | null): number {
  if (typeof raw !== 'string') throw new Error('kg fehlt');
  const normalized = raw.replace(',', '.').trim();
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0 || n > 500) {
    throw new Error(`Ungueltiger Wert: ${raw}`);
  }
  return Math.round(n * 100) / 100;
}

function parseOccurredAt(raw: FormDataEntryValue | null): Date {
  if (typeof raw !== 'string' || raw === '') return new Date();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error('Ungueltiges Datum');
  return d;
}

function parseLabel(raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string') throw new Error('label fehlt');
  const trimmed = raw.trim();
  if (trimmed.length === 0) throw new Error('label leer');
  if (trimmed.length > 200) throw new Error('label zu lang');
  return trimmed;
}

function parseNonNegativeNumber(
  raw: FormDataEntryValue | null,
  field: string,
  max: number,
): number {
  if (typeof raw !== 'string') throw new Error(`${field} fehlt`);
  const normalized = raw.replace(',', '.').trim();
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > max) {
    throw new Error(`Ungueltiger ${field}-Wert: ${raw}`);
  }
  return Math.round(n * 10) / 10;
}

function parseOptionalNonNegativeNumber(
  raw: FormDataEntryValue | null,
  field: string,
  max: number,
): number | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  return parseNonNegativeNumber(raw, field, max);
}

export async function logWeightAction(formData: FormData) {
  const kg = parseKg(formData.get('kg'));
  const occurredAt = parseOccurredAt(formData.get('occurred_at'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await logWeight(supabase, {
    user_id: user.id,
    kg,
    occurred_at: occurredAt,
    source: 'manual',
  });

  revalidatePath('/');
}

export async function correctWeightAction(formData: FormData) {
  const corrects = formData.get('event_id');
  const newKg = parseKg(formData.get('kg'));
  if (typeof corrects !== 'string') throw new Error('event_id fehlt');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await correctEvent(supabase, {
    user_id: user.id,
    corrects_event_id: corrects,
    new_payload: { kg: newKg },
    reason: 'manual correction',
    source: 'manual',
  });

  revalidatePath('/');
}

export async function retractWeightAction(formData: FormData) {
  const retracts = formData.get('event_id');
  if (typeof retracts !== 'string') throw new Error('event_id fehlt');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await retractEvent(supabase, {
    user_id: user.id,
    retracts_event_id: retracts,
    reason: 'manual retraction',
    source: 'manual',
  });

  revalidatePath('/');
}

export async function logMealAction(formData: FormData) {
  const label = parseLabel(formData.get('label'));
  const kcal = parseNonNegativeNumber(formData.get('kcal'), 'kcal', 20000);
  const protein_g = parseOptionalNonNegativeNumber(formData.get('protein_g'), 'protein_g', 2000);
  const carbs_g = parseOptionalNonNegativeNumber(formData.get('carbs_g'), 'carbs_g', 2000);
  const fat_g = parseOptionalNonNegativeNumber(formData.get('fat_g'), 'fat_g', 2000);
  const occurredAt = parseOccurredAt(formData.get('occurred_at'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await logMeal(supabase, {
    user_id: user.id,
    label,
    kcal,
    protein_g,
    carbs_g,
    fat_g,
    occurred_at: occurredAt,
    source: 'manual',
  });

  revalidatePath('/');
}

export async function retractMealAction(formData: FormData) {
  const retracts = formData.get('event_id');
  if (typeof retracts !== 'string') throw new Error('event_id fehlt');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await retractEvent(supabase, {
    user_id: user.id,
    retracts_event_id: retracts,
    reason: 'manual retraction',
    source: 'manual',
  });

  revalidatePath('/');
}
