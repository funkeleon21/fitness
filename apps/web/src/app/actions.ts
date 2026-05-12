'use server';

import { createClient } from '@/lib/supabase/server';
import { correctEvent, logWeight, retractEvent } from '@fitness/ingestion';
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
