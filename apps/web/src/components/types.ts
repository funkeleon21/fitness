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
