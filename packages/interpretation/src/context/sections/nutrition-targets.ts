import { getNutritionTargets } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContextSection } from '../types';

const LABELS: Record<string, string> = {
  kcal: 'kcal',
  protein_g: 'Protein',
  carbs_g: 'Kohlenhydrate',
  fat_g: 'Fett',
  sugar_g: 'Zucker (Limit)',
  fiber_g: 'Ballaststoffe',
  saturated_fat_g: 'ges. Fettsäuren (Limit)',
  salt_g: 'Salz (Limit)',
};

export async function getNutritionTargetsContext(
  client: SupabaseClient,
  userId: string,
): Promise<UserContextSection> {
  const targets = await getNutritionTargets(client, userId);
  const entries = Object.entries(targets).filter(([, v]) => v !== null) as Array<[string, number]>;

  if (entries.length === 0) {
    return {
      domain: 'nutrition.targets',
      label: 'Tagesziele',
      available: false,
      summary:
        'Keine persönlichen Tages-Ziele gesetzt. App zeigt aktuell DGE/WHO-Richtwerte. Wenn der User Ziele nennt, schlage set_nutrition_targets vor.',
    };
  }

  const lines = entries.map(([key, value]) => {
    const label = LABELS[key] ?? key;
    const unit = key === 'kcal' ? 'kcal' : 'g';
    return `- ${label}: ${value} ${unit}`;
  });

  return {
    domain: 'nutrition.targets',
    label: 'Tagesziele',
    available: true,
    summary: lines.join('\n'),
  };
}
