import { Dashboard } from '@/components/Dashboard';
import type { DashboardData, MealPoint, MealTemplateView, NutritionData } from '@/components/types';
import { type NutritionTargets, mergeTargets } from '@/lib/nutrition';
import { createClient } from '@/lib/supabase/server';
import {
  type MealDataPoint,
  type MealTemplate,
  getMealProjection,
  getNutritionTargets,
  getWeightProjection,
  listMealTemplates,
} from '@fitness/db';
import { redirect } from 'next/navigation';

function deriveNameAndInitials(email: string | undefined): { name: string; initials: string } {
  if (!email) return { name: 'Nico', initials: 'N' };
  const local = email.split('@')[0] ?? 'Nico';
  const name = local.charAt(0).toUpperCase() + local.slice(1);
  const initials = name.charAt(0).toUpperCase();
  return { name, initials };
}

function mealToPoint(m: MealDataPoint): MealPoint {
  return {
    event_id: m.event_id,
    occurred_at: m.occurred_at.toISOString(),
    label: m.label,
    kcal: m.kcal,
    protein_g: m.protein_g,
    carbs_g: m.carbs_g,
    fat_g: m.fat_g,
    sugar_g: m.sugar_g,
    fiber_g: m.fiber_g,
    saturated_fat_g: m.saturated_fat_g,
    salt_g: m.salt_g,
    meal_type: m.meal_type,
    source: m.source,
    confidence: m.confidence,
    corrected: m.corrected,
  };
}

function templateToView(t: MealTemplate): MealTemplateView {
  return {
    id: t.id,
    label: t.label,
    kcal: t.kcal,
    protein_g: t.protein_g,
    carbs_g: t.carbs_g,
    fat_g: t.fat_g,
    sugar_g: t.sugar_g,
    fiber_g: t.fiber_g,
    saturated_fat_g: t.saturated_fat_g,
    salt_g: t.salt_g,
    slot: t.slot,
    usage_count: t.usage_count,
    last_used_at: t.last_used_at ? t.last_used_at.toISOString() : null,
  };
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [weight, meals, templates, persistedTargets] = await Promise.all([
    getWeightProjection(supabase, user.id),
    getMealProjection(supabase, user.id),
    listMealTemplates(supabase, user.id),
    getNutritionTargets(supabase, user.id),
  ]);
  const targets: NutritionTargets = mergeTargets(persistedTargets);

  const data: DashboardData = {
    series: weight.series.map((p) => ({
      event_id: p.event_id,
      occurred_at: p.occurred_at.toISOString(),
      kg: p.kg,
      corrected: p.corrected,
    })),
    latest: weight.latest
      ? {
          event_id: weight.latest.event_id,
          occurred_at: weight.latest.occurred_at.toISOString(),
          kg: weight.latest.kg,
          corrected: weight.latest.corrected,
        }
      : null,
    trend7d: weight.trend7d,
    trend14d: weight.trend14d,
    trend7dChangeKg: weight.trend7dChangeKg,
  };

  const nutrition: NutritionData = {
    today: meals.today.map(mealToPoint),
    todayTotals: meals.todayTotals,
    recent: meals.recent.map(mealToPoint),
  };

  const mealTemplates: MealTemplateView[] = templates.map(templateToView);

  const { name, initials } = deriveNameAndInitials(user.email);

  return (
    <Dashboard
      data={data}
      nutrition={nutrition}
      nutritionTargets={targets}
      mealTemplates={mealTemplates}
      userName={name}
      initials={initials}
    />
  );
}
