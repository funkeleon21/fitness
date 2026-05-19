// UI-Typen leiten wir aus den Core-Schemas ab, damit String-Unions nicht
// driften können. Aliase erhalten die bisherigen Namen, damit Call-Sites
// stabil bleiben.
import type { MealType, WorkoutIcon, WorkoutMood } from '@fitness/core';

export type MealSlotIdValue = MealType;
export type WorkoutMoodValue = WorkoutMood;
export type WorkoutIconValue = WorkoutIcon;

export interface WeightPoint {
  event_id: string;
  occurred_at: string; // ISO
  kg: number;
  corrected: boolean;
}

export interface DashboardData {
  series: WeightPoint[];
  latest: WeightPoint | null;
  trend7d: number | null;
  trend14d: number | null;
  trend7dChangeKg: number | null;
}

export interface MealPoint {
  event_id: string;
  occurred_at: string; // ISO
  label: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
  meal_type: MealSlotIdValue | null;
  source: string;
  confidence: number | null;
  corrected: boolean;
}

export interface MealDayTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  fiber_g: number;
  saturated_fat_g: number;
  salt_g: number;
  count: number;
}

export interface NutritionData {
  today: MealPoint[];
  todayTotals: MealDayTotals;
  recent: MealPoint[];
}

// Snapshot eines Trainings für die UI. Werte stammen aus der Workout-Projection,
// inkl. ggf. angewendeter Korrektur-Events.
export interface WorkoutExerciseView {
  name: string;
  sets: Array<{
    reps?: number;
    weight_kg?: number;
    rpe?: number;
    note?: string;
  }>;
  note?: string;
}

export interface WorkoutPoint {
  event_id: string;
  occurred_at: string; // ISO
  label: string;
  duration_min: number | null;
  exercises: WorkoutExerciseView[] | null;
  mood: WorkoutMoodValue | null;
  note: string | null;
  icon: WorkoutIconValue | null;
  template_id: string | null;
  source: string;
  confidence: number | null;
  corrected: boolean;
}

export interface WorkoutWeekTotalsView {
  count: number;
  totalSets: number;
  totalDurationMin: number;
}

export interface TrainingData {
  today: WorkoutPoint[];
  thisWeek: WorkoutPoint[];
  thisWeekTotals: WorkoutWeekTotalsView;
  recent: WorkoutPoint[];
  // Alle nicht-retracted Workouts, neuste zuerst. Wird im Training-Tab für die
  // Wochen-Navigation gebraucht; Aggregate pro Kalenderwoche werden clientseitig
  // daraus berechnet.
  allWorkouts: WorkoutPoint[];
}

// Vorlage für eine Trainingseinheit. Hält nur die Struktur (welche Übungen,
// wie viele Sätze pro Übung). Gewichte/Wdh. werden beim Loggen jedes Mal neu
// eingetragen — eingefrorene Default-Werte würden mit Progressive Overload
// veralten.
export interface WorkoutTemplateView {
  id: string;
  label: string;
  exercises: WorkoutExerciseView[];
  icon: WorkoutIconValue;
  default_duration_min: number | null;
  usage_count: number;
  last_used_at: string | null;
}

export interface MealTemplateView {
  id: string;
  label: string;
  kcal: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sugar_g: number | null;
  fiber_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
  slot: MealSlotIdValue | null;
  usage_count: number;
  last_used_at: string | null; // ISO
}
