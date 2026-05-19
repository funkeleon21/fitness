import { Dashboard } from '@/components/Dashboard';
import type {
  DashboardData,
  MealPoint,
  MealTemplateView,
  NutritionData,
  TrainingData,
  WorkoutPoint,
  WorkoutTemplateView,
} from '@/components/types';
import { type NutritionTargets, mergeTargets } from '@/lib/nutrition';
import { createClient } from '@/lib/supabase/server';
import {
  type MealDataPoint,
  type MealTemplate,
  type WorkoutDataPoint,
  type WorkoutTemplate,
  getMealProjection,
  getNutritionTargets,
  getWeightProjection,
  getWorkoutProjection,
  listMealTemplates,
  listWorkoutTemplates,
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

function workoutTemplateToView(t: WorkoutTemplate): WorkoutTemplateView {
  return {
    id: t.id,
    label: t.label,
    exercises: t.exercises,
    icon: t.icon,
    default_duration_min: t.default_duration_min,
    usage_count: t.usage_count,
    last_used_at: t.last_used_at ? t.last_used_at.toISOString() : null,
  };
}

function workoutToPoint(w: WorkoutDataPoint): WorkoutPoint {
  return {
    event_id: w.event_id,
    occurred_at: w.occurred_at.toISOString(),
    label: w.label,
    duration_min: w.duration_min,
    exercises: w.exercises,
    mood: w.mood,
    note: w.note,
    icon: w.icon,
    template_id: w.template_id,
    source: w.source,
    confidence: w.confidence,
    corrected: w.corrected,
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

  const [weight, meals, workouts, templates, workoutTpls, persistedTargets] = await Promise.all([
    getWeightProjection(supabase, user.id),
    getMealProjection(supabase, user.id),
    getWorkoutProjection(supabase, user.id),
    listMealTemplates(supabase, user.id),
    listWorkoutTemplates(supabase, user.id),
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

  const training: TrainingData = {
    today: workouts.today.map(workoutToPoint),
    thisWeek: workouts.thisWeek.map(workoutToPoint),
    thisWeekTotals: workouts.thisWeekTotals,
    recent: workouts.recent.map(workoutToPoint),
    allWorkouts: workouts.allWorkouts.map(workoutToPoint),
  };

  const workoutTemplates: WorkoutTemplateView[] = workoutTpls.map(workoutTemplateToView);

  const { name, initials } = deriveNameAndInitials(user.email);

  return (
    <Dashboard
      data={data}
      nutrition={nutrition}
      nutritionTargets={targets}
      mealTemplates={mealTemplates}
      training={training}
      workoutTemplates={workoutTemplates}
      userName={name}
      initials={initials}
    />
  );
}
