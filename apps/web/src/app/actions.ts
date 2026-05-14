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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface ActionContext {
  supabase: SupabaseServerClient;
  userId: string;
}

// Auth + revalidate Boilerplate liegt hier zentral: jede Action ist 1:1 ein
// Aufruf von withAuth(...), dadurch bleibt der Korpus jeder Action auf die
// fachliche Logik beschränkt. redirect('/login') wirft intern eine
// NEXT_REDIRECT-Exception — daher kein return danach.
function withAuth(handler: (ctx: ActionContext, formData: FormData) => Promise<void>) {
  return async (formData: FormData): Promise<void> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    await handler({ supabase, userId: user.id }, formData);
    revalidatePath('/');
  };
}

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

function parseOptionalUuid(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const v = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    throw new Error('Ungueltige UUID');
  }
  return v;
}

// Gemeinsame Felder für alle 4 meal-/template-Aktionen: label + kcal + 7
// optionale Nährwerte. meal_type/slot/occurred_at/template_id bleiben
// fachspezifisch und werden im jeweiligen Caller geparst.
interface MealNutrients {
  label: string;
  kcal: number;
  protein_g: number | undefined;
  carbs_g: number | undefined;
  fat_g: number | undefined;
  sugar_g: number | undefined;
  fiber_g: number | undefined;
  saturated_fat_g: number | undefined;
  salt_g: number | undefined;
}

function parseMealNutrients(formData: FormData): MealNutrients {
  return {
    label: parseLabel(formData.get('label')),
    kcal: parseNonNegativeNumber(formData.get('kcal'), 'kcal', 20000),
    protein_g: parseOptionalNonNegativeNumber(formData.get('protein_g'), 'protein_g', 2000),
    carbs_g: parseOptionalNonNegativeNumber(formData.get('carbs_g'), 'carbs_g', 2000),
    fat_g: parseOptionalNonNegativeNumber(formData.get('fat_g'), 'fat_g', 2000),
    sugar_g: parseOptionalNonNegativeNumber(formData.get('sugar_g'), 'sugar_g', 2000),
    fiber_g: parseOptionalNonNegativeNumber(formData.get('fiber_g'), 'fiber_g', 2000),
    saturated_fat_g: parseOptionalNonNegativeNumber(
      formData.get('saturated_fat_g'),
      'saturated_fat_g',
      2000,
    ),
    salt_g: parseOptionalNonNegativeNumber(formData.get('salt_g'), 'salt_g', 200),
  };
}

// Mappt MealNutrients aufs Template-DB-Format (undefined → null).
function asTemplateNutrients(n: MealNutrients) {
  return {
    label: n.label,
    kcal: n.kcal,
    protein_g: n.protein_g ?? null,
    carbs_g: n.carbs_g ?? null,
    fat_g: n.fat_g ?? null,
    sugar_g: n.sugar_g ?? null,
    fiber_g: n.fiber_g ?? null,
    saturated_fat_g: n.saturated_fat_g ?? null,
    salt_g: n.salt_g ?? null,
  };
}

function parseBool(raw: FormDataEntryValue | null): boolean {
  return typeof raw === 'string' && raw === 'true';
}

export const logWeightAction = withAuth(async ({ supabase, userId }, formData) => {
  await logWeight(supabase, {
    user_id: userId,
    kg: parseKg(formData.get('kg')),
    occurred_at: parseOccurredAt(formData.get('occurred_at')),
    source: 'manual',
  });
});

export const correctWeightAction = withAuth(async ({ supabase, userId }, formData) => {
  const corrects = formData.get('event_id');
  if (typeof corrects !== 'string') throw new Error('event_id fehlt');
  await correctEvent(supabase, {
    user_id: userId,
    corrects_event_id: corrects,
    new_payload: { kg: parseKg(formData.get('kg')) },
    reason: 'manual correction',
    source: 'manual',
  });
});

export const retractWeightAction = withAuth(async ({ supabase, userId }, formData) => {
  const retracts = formData.get('event_id');
  if (typeof retracts !== 'string') throw new Error('event_id fehlt');
  await retractEvent(supabase, {
    user_id: userId,
    retracts_event_id: retracts,
    reason: 'manual retraction',
    source: 'manual',
  });
});

export const logMealAction = withAuth(async ({ supabase, userId }, formData) => {
  const nutrients = parseMealNutrients(formData);
  const meal_type = parseOptionalMealType(formData.get('meal_type'));
  const template_id = parseOptionalUuid(formData.get('template_id'));
  const occurredAt = parseOccurredAt(formData.get('occurred_at'));

  await logMeal(supabase, {
    user_id: userId,
    ...nutrients,
    meal_type,
    template_id,
    occurred_at: occurredAt,
    source: 'manual',
  });

  if (template_id) {
    await recordMealTemplateUsage(supabase, userId, template_id, occurredAt);
  }
});

export const createMealTemplateAction = withAuth(async ({ supabase, userId }, formData) => {
  const nutrients = parseMealNutrients(formData);
  const slot = parseOptionalMealType(formData.get('slot'));
  await createMealTemplate(supabase, {
    user_id: userId,
    ...asTemplateNutrients(nutrients),
    slot: slot ?? null,
  });
});

export const updateMealTemplateAction = withAuth(async ({ supabase, userId }, formData) => {
  const id = parseOptionalUuid(formData.get('id'));
  if (!id) throw new Error('id fehlt');
  const nutrients = parseMealNutrients(formData);
  const slot = parseOptionalMealType(formData.get('slot'));
  await updateMealTemplate(supabase, userId, id, {
    ...asTemplateNutrients(nutrients),
    slot: slot ?? null,
  });
});

export const deleteMealTemplateAction = withAuth(async ({ supabase, userId }, formData) => {
  const id = parseOptionalUuid(formData.get('id'));
  if (!id) throw new Error('id fehlt');
  await deleteMealTemplate(supabase, userId, id);
});

// Loggt eine Mahlzeit und legt optional in einem Atemzug eine Vorlage an. Aufgerufen
// vom MealComposerSheet, das im Foto-Flow am Ende „Nur loggen" oder „Als Vorlage + loggen"
// als einzige Auswahl anbietet.
export const saveComposedMealAction = withAuth(async ({ supabase, userId }, formData) => {
  const nutrients = parseMealNutrients(formData);
  const meal_type = parseOptionalMealType(formData.get('meal_type'));
  const occurredAt = parseOccurredAt(formData.get('occurred_at'));
  const saveAsTemplate = parseBool(formData.get('save_as_template'));
  const templateNameRaw = formData.get('template_name');
  const templateName =
    typeof templateNameRaw === 'string' && templateNameRaw.trim().length > 0
      ? templateNameRaw.trim()
      : nutrients.label;

  let templateId: string | undefined;
  if (saveAsTemplate) {
    const tpl = await createMealTemplate(supabase, {
      user_id: userId,
      ...asTemplateNutrients({ ...nutrients, label: templateName }),
      slot: meal_type ?? null,
    });
    templateId = tpl.id;
  }

  await logMeal(supabase, {
    user_id: userId,
    ...nutrients,
    meal_type,
    template_id: templateId,
    occurred_at: occurredAt,
    source: 'manual',
  });

  if (templateId) {
    await recordMealTemplateUsage(supabase, userId, templateId, occurredAt);
  }
});

export const logMealFromTemplateAction = withAuth(async ({ supabase, userId }, formData) => {
  const id = parseOptionalUuid(formData.get('template_id'));
  if (!id) throw new Error('template_id fehlt');
  // Override-Slot, z.B. wenn aus dem TemplatePicker "Frühstück" geloggt wird,
  // aber das Template selbst ohne Default-Slot ist. Sonst nimmt es den Template-Slot.
  const meal_type_override = parseOptionalMealType(formData.get('meal_type'));
  const occurredAt = parseOccurredAt(formData.get('occurred_at'));

  const tpl = await getMealTemplate(supabase, userId, id);
  if (!tpl) throw new Error('Template nicht gefunden');

  await logMeal(supabase, {
    user_id: userId,
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

  await recordMealTemplateUsage(supabase, userId, tpl.id, occurredAt);
});

export const retractMealAction = withAuth(async ({ supabase, userId }, formData) => {
  const retracts = formData.get('event_id');
  if (typeof retracts !== 'string') throw new Error('event_id fehlt');
  await retractEvent(supabase, {
    user_id: userId,
    retracts_event_id: retracts,
    reason: 'manual retraction',
    source: 'manual',
  });
});
