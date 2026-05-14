'use server';

import { createClient } from '@/lib/supabase/server';
import type { MealType } from '@fitness/core';
import {
  createMealTemplate,
  deleteMealTemplate,
  getMealTemplate,
  recordMealTemplateUsage,
  updateMealTemplate,
} from '@fitness/db';
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

const VALID_MEAL_TYPES = new Set<MealType>(['breakfast', 'lunch', 'dinner', 'snack']);

function parseOptionalMealType(raw: FormDataEntryValue | null): MealType | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const v = raw.trim();
  if (!VALID_MEAL_TYPES.has(v as MealType)) {
    throw new Error(`Ungueltiger meal_type: ${raw}`);
  }
  return v as MealType;
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

function parseOptionalUuid(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const v = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    throw new Error('Ungueltige UUID');
  }
  return v;
}

export async function logMealAction(formData: FormData) {
  const label = parseLabel(formData.get('label'));
  const kcal = parseNonNegativeNumber(formData.get('kcal'), 'kcal', 20000);
  const protein_g = parseOptionalNonNegativeNumber(formData.get('protein_g'), 'protein_g', 2000);
  const carbs_g = parseOptionalNonNegativeNumber(formData.get('carbs_g'), 'carbs_g', 2000);
  const fat_g = parseOptionalNonNegativeNumber(formData.get('fat_g'), 'fat_g', 2000);
  const sugar_g = parseOptionalNonNegativeNumber(formData.get('sugar_g'), 'sugar_g', 2000);
  const fiber_g = parseOptionalNonNegativeNumber(formData.get('fiber_g'), 'fiber_g', 2000);
  const saturated_fat_g = parseOptionalNonNegativeNumber(
    formData.get('saturated_fat_g'),
    'saturated_fat_g',
    2000,
  );
  const salt_g = parseOptionalNonNegativeNumber(formData.get('salt_g'), 'salt_g', 200);
  const meal_type = parseOptionalMealType(formData.get('meal_type'));
  const template_id = parseOptionalUuid(formData.get('template_id'));
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
    sugar_g,
    fiber_g,
    saturated_fat_g,
    salt_g,
    meal_type,
    template_id,
    occurred_at: occurredAt,
    source: 'manual',
  });

  if (template_id) {
    await recordMealTemplateUsage(supabase, user.id, template_id, occurredAt);
  }

  revalidatePath('/');
}

export async function createMealTemplateAction(formData: FormData) {
  const label = parseLabel(formData.get('label'));
  const kcal = parseNonNegativeNumber(formData.get('kcal'), 'kcal', 20000);
  const protein_g = parseOptionalNonNegativeNumber(formData.get('protein_g'), 'protein_g', 2000);
  const carbs_g = parseOptionalNonNegativeNumber(formData.get('carbs_g'), 'carbs_g', 2000);
  const fat_g = parseOptionalNonNegativeNumber(formData.get('fat_g'), 'fat_g', 2000);
  const sugar_g = parseOptionalNonNegativeNumber(formData.get('sugar_g'), 'sugar_g', 2000);
  const fiber_g = parseOptionalNonNegativeNumber(formData.get('fiber_g'), 'fiber_g', 2000);
  const saturated_fat_g = parseOptionalNonNegativeNumber(
    formData.get('saturated_fat_g'),
    'saturated_fat_g',
    2000,
  );
  const salt_g = parseOptionalNonNegativeNumber(formData.get('salt_g'), 'salt_g', 200);
  const slot = parseOptionalMealType(formData.get('slot'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await createMealTemplate(supabase, {
    user_id: user.id,
    label,
    kcal,
    protein_g: protein_g ?? null,
    carbs_g: carbs_g ?? null,
    fat_g: fat_g ?? null,
    sugar_g: sugar_g ?? null,
    fiber_g: fiber_g ?? null,
    saturated_fat_g: saturated_fat_g ?? null,
    salt_g: salt_g ?? null,
    slot: slot ?? null,
  });

  revalidatePath('/');
}

export async function updateMealTemplateAction(formData: FormData) {
  const id = parseOptionalUuid(formData.get('id'));
  if (!id) throw new Error('id fehlt');
  const label = parseLabel(formData.get('label'));
  const kcal = parseNonNegativeNumber(formData.get('kcal'), 'kcal', 20000);
  const protein_g = parseOptionalNonNegativeNumber(formData.get('protein_g'), 'protein_g', 2000);
  const carbs_g = parseOptionalNonNegativeNumber(formData.get('carbs_g'), 'carbs_g', 2000);
  const fat_g = parseOptionalNonNegativeNumber(formData.get('fat_g'), 'fat_g', 2000);
  const sugar_g = parseOptionalNonNegativeNumber(formData.get('sugar_g'), 'sugar_g', 2000);
  const fiber_g = parseOptionalNonNegativeNumber(formData.get('fiber_g'), 'fiber_g', 2000);
  const saturated_fat_g = parseOptionalNonNegativeNumber(
    formData.get('saturated_fat_g'),
    'saturated_fat_g',
    2000,
  );
  const salt_g = parseOptionalNonNegativeNumber(formData.get('salt_g'), 'salt_g', 200);
  const slot = parseOptionalMealType(formData.get('slot'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await updateMealTemplate(supabase, user.id, id, {
    label,
    kcal,
    protein_g: protein_g ?? null,
    carbs_g: carbs_g ?? null,
    fat_g: fat_g ?? null,
    sugar_g: sugar_g ?? null,
    fiber_g: fiber_g ?? null,
    saturated_fat_g: saturated_fat_g ?? null,
    salt_g: salt_g ?? null,
    slot: slot ?? null,
  });

  revalidatePath('/');
}

export async function deleteMealTemplateAction(formData: FormData) {
  const id = parseOptionalUuid(formData.get('id'));
  if (!id) throw new Error('id fehlt');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await deleteMealTemplate(supabase, user.id, id);
  revalidatePath('/');
}

function parseBool(raw: FormDataEntryValue | null): boolean {
  return typeof raw === 'string' && raw === 'true';
}

// Loggt eine Mahlzeit und legt optional in einem Atemzug eine Vorlage an. Aufgerufen
// vom MealComposerSheet, das im Foto-Flow am Ende „Nur loggen" oder „Als Vorlage + loggen"
// als einzige Auswahl anbietet.
export async function saveComposedMealAction(formData: FormData) {
  const label = parseLabel(formData.get('label'));
  const kcal = parseNonNegativeNumber(formData.get('kcal'), 'kcal', 20000);
  const protein_g = parseOptionalNonNegativeNumber(formData.get('protein_g'), 'protein_g', 2000);
  const carbs_g = parseOptionalNonNegativeNumber(formData.get('carbs_g'), 'carbs_g', 2000);
  const fat_g = parseOptionalNonNegativeNumber(formData.get('fat_g'), 'fat_g', 2000);
  const sugar_g = parseOptionalNonNegativeNumber(formData.get('sugar_g'), 'sugar_g', 2000);
  const fiber_g = parseOptionalNonNegativeNumber(formData.get('fiber_g'), 'fiber_g', 2000);
  const saturated_fat_g = parseOptionalNonNegativeNumber(
    formData.get('saturated_fat_g'),
    'saturated_fat_g',
    2000,
  );
  const salt_g = parseOptionalNonNegativeNumber(formData.get('salt_g'), 'salt_g', 200);
  const meal_type = parseOptionalMealType(formData.get('meal_type'));
  const saveAsTemplate = parseBool(formData.get('save_as_template'));
  const templateNameRaw = formData.get('template_name');
  const templateName =
    typeof templateNameRaw === 'string' && templateNameRaw.trim().length > 0
      ? templateNameRaw.trim()
      : label;
  const occurredAt = parseOccurredAt(formData.get('occurred_at'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let templateId: string | undefined;
  if (saveAsTemplate) {
    const tpl = await createMealTemplate(supabase, {
      user_id: user.id,
      label: templateName,
      kcal,
      protein_g: protein_g ?? null,
      carbs_g: carbs_g ?? null,
      fat_g: fat_g ?? null,
      sugar_g: sugar_g ?? null,
      fiber_g: fiber_g ?? null,
      saturated_fat_g: saturated_fat_g ?? null,
      salt_g: salt_g ?? null,
      slot: meal_type ?? null,
    });
    templateId = tpl.id;
  }

  await logMeal(supabase, {
    user_id: user.id,
    label,
    kcal,
    protein_g,
    carbs_g,
    fat_g,
    sugar_g,
    fiber_g,
    saturated_fat_g,
    salt_g,
    meal_type,
    template_id: templateId,
    occurred_at: occurredAt,
    source: 'manual',
  });

  if (templateId) {
    await recordMealTemplateUsage(supabase, user.id, templateId, occurredAt);
  }

  revalidatePath('/');
}

export async function logMealFromTemplateAction(formData: FormData) {
  const id = parseOptionalUuid(formData.get('template_id'));
  if (!id) throw new Error('template_id fehlt');
  // Override-Slot, z.B. wenn aus dem TemplatePicker "Frühstück" geloggt wird,
  // aber das Template selbst ohne Default-Slot ist. Sonst nimmt es den Template-Slot.
  const meal_type_override = parseOptionalMealType(formData.get('meal_type'));
  const occurredAt = parseOccurredAt(formData.get('occurred_at'));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const tpl = await getMealTemplate(supabase, user.id, id);
  if (!tpl) throw new Error('Template nicht gefunden');

  await logMeal(supabase, {
    user_id: user.id,
    label: tpl.label,
    kcal: tpl.kcal,
    protein_g: tpl.protein_g ?? undefined,
    carbs_g: tpl.carbs_g ?? undefined,
    fat_g: tpl.fat_g ?? undefined,
    sugar_g: tpl.sugar_g ?? undefined,
    fiber_g: tpl.fiber_g ?? undefined,
    saturated_fat_g: tpl.saturated_fat_g ?? undefined,
    salt_g: tpl.salt_g ?? undefined,
    meal_type: meal_type_override ?? tpl.slot ?? undefined,
    template_id: tpl.id,
    occurred_at: occurredAt,
    source: 'manual',
  });

  await recordMealTemplateUsage(supabase, user.id, tpl.id, occurredAt);
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
