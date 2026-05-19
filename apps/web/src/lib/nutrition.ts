import type { IconName } from '@/components/Icon';

export type MealSlotId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSlotMeta {
  id: MealSlotId;
  label: string;
  icon: IconName;
  tint: string;
  iconColor: string;
}

// Slot-Akzent als Tagesverlauf: Frühstück (Morgenröte/Aprikose) → Mittag
// (Mittagsgold) → Abend (Dämmerblau). Snack steht abseits dieser Achse als
// eigene lila Akzentfarbe. Icon-Wahl folgt der Tageszeit-Metapher:
// sunrise → sun → moon. tint ist die weiche Hintergrundfarbe (Bubble),
// iconColor die tiefere Variante für Icon-Stroke und kcal-Pill-Text.
export const MEAL_SLOTS: MealSlotMeta[] = [
  {
    id: 'breakfast',
    label: 'Frühstück',
    icon: 'coffee',
    tint: 'rgba(247,198,168,0.34)',
    iconColor: '#c9764f',
  },
  {
    id: 'lunch',
    label: 'Mittagessen',
    icon: 'sun',
    tint: 'rgba(238,190,105,0.34)',
    iconColor: '#b8801a',
  },
  {
    id: 'dinner',
    label: 'Abendessen',
    icon: 'moon',
    tint: 'rgba(110,125,185,0.30)',
    iconColor: '#4a5a8c',
  },
  {
    id: 'snack',
    label: 'Snacks',
    icon: 'star',
    tint: 'rgba(178,158,222,0.34)',
    iconColor: '#8975c7',
  },
];

// Lookup-Helper: für ein meal_type (oder null) das Slot-Meta liefern. Wird in
// FoodMemoryCardItem genutzt, um die Akzentfarbe des Templates zu spiegeln.
export function slotMeta(slotId: MealSlotId | null): MealSlotMeta | null {
  if (slotId === null) return null;
  return MEAL_SLOTS.find((s) => s.id === slotId) ?? null;
}

// Auto-Slot per Uhrzeit. Wird als Fallback verwendet, wenn kein expliziter
// meal_type im Event-Payload steht.
export function mealSlotFromIso(iso: string): MealSlotId {
  const h = new Date(iso).getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

// Slot einer Mahlzeit. Wenn explizit gesetzt, gewinnt das gegenüber der Uhrzeit-Heuristik.
export function effectiveSlot(meal: {
  meal_type: MealSlotId | null;
  occurred_at: string;
}): MealSlotId {
  return meal.meal_type ?? mealSlotFromIso(meal.occurred_at);
}

// Fallback-Tagesziele. Werden später durch persistierte User-Settings ersetzt (Agent-Tool).
//
// 'goal'  = Zielwert, den man erreichen will (z.B. Protein). Progress voll = gut.
// 'limit' = Obergrenze, die man nicht überschreiten soll (z.B. Zucker, Salz). >100% = amber.
export type TargetKind = 'goal' | 'limit';

export interface TargetSpec {
  value: number;
  kind: TargetKind;
}

export interface NutritionTargets {
  kcal: TargetSpec;
  protein_g: TargetSpec;
  carbs_g: TargetSpec;
  fat_g: TargetSpec;
  sugar_g: TargetSpec;
  fiber_g: TargetSpec;
  saturated_fat_g: TargetSpec;
  salt_g: TargetSpec;
}

export const DEFAULT_TARGETS: NutritionTargets = {
  kcal: { value: 2000, kind: 'goal' },
  protein_g: { value: 120, kind: 'goal' },
  carbs_g: { value: 240, kind: 'goal' },
  fat_g: { value: 65, kind: 'goal' },
  // WHO/DGE-Richtwerte als Default. Werden von persistierten User-Werten überschrieben.
  sugar_g: { value: 50, kind: 'limit' },
  fiber_g: { value: 30, kind: 'goal' },
  saturated_fat_g: { value: 20, kind: 'limit' },
  salt_g: { value: 6, kind: 'limit' },
};

// Persistierte Werte aus der nutrition_targets-Projection (alle nullable)
// auf die voll bestückte UI-Form abbilden. Wo der User nichts gesetzt hat,
// gilt der DGE/WHO-Default. kind bleibt fix in der Lib.
export interface PersistedTargets {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
}

export function mergeTargets(persisted: PersistedTargets): NutritionTargets {
  const keys = Object.keys(DEFAULT_TARGETS) as Array<keyof NutritionTargets>;
  const merged = {} as NutritionTargets;
  for (const key of keys) {
    const v = persisted[key];
    merged[key] = {
      value: v !== null && v > 0 ? v : DEFAULT_TARGETS[key].value,
      kind: DEFAULT_TARGETS[key].kind,
    };
  }
  return merged;
}

// "Heute, 24. Mai"
export function formatTodayHeading(date = new Date()): string {
  const formatted = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  return `Heute, ${formatted}`;
}
