import type { IconName } from '@/components/Icon';

export type MealSlotId = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSlotMeta {
  id: MealSlotId;
  label: string;
  icon: IconName;
  tint: string;
  iconColor: string;
}

export const MEAL_SLOTS: MealSlotMeta[] = [
  {
    id: 'breakfast',
    label: 'Frühstück',
    icon: 'sun',
    tint: 'rgba(226,195,148,0.36)',
    iconColor: '#c49855',
  },
  {
    id: 'lunch',
    label: 'Mittagessen',
    icon: 'sun',
    tint: 'rgba(226,195,148,0.36)',
    iconColor: '#c49855',
  },
  {
    id: 'dinner',
    label: 'Abendessen',
    icon: 'moon',
    tint: 'rgba(226,195,148,0.36)',
    iconColor: '#c49855',
  },
  {
    id: 'snack',
    label: 'Snacks',
    icon: 'moon',
    tint: 'rgba(178,158,222,0.34)',
    iconColor: '#8975c7',
  },
];

// Auto-Slot per Uhrzeit. Wird verwendet, solange kein meal_type im Event-Payload steht.
export function mealSlotFromIso(iso: string): MealSlotId {
  const h = new Date(iso).getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
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
  // WHO/DGE-Richtwerte als Default. Sind persoenliche Setzungen, kommen spaeter aus User-Settings.
  sugar_g: { value: 50, kind: 'limit' },
  fiber_g: { value: 30, kind: 'goal' },
  saturated_fat_g: { value: 20, kind: 'limit' },
  salt_g: { value: 6, kind: 'limit' },
};

// "Heute, 24. Mai"
export function formatTodayHeading(date = new Date()): string {
  const formatted = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  return `Heute, ${formatted}`;
}
