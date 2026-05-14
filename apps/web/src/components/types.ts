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
  usage_count: number;
  last_used_at: string | null; // ISO
}
