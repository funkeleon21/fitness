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
export interface NutritionTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const DEFAULT_TARGETS: NutritionTargets = {
  kcal: 2000,
  protein_g: 120,
  carbs_g: 240,
  fat_g: 65,
};

// "Heute, 24. Mai"
export function formatTodayHeading(date = new Date()): string {
  const formatted = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  return `Heute, ${formatted}`;
}
