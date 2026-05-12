import { Dashboard } from '@/components/Dashboard';
import type { DashboardData } from '@/components/types';
import { createClient } from '@/lib/supabase/server';
import { getWeightProjection } from '@fitness/db';
import { redirect } from 'next/navigation';

function deriveNameAndInitials(email: string | undefined): { name: string; initials: string } {
  if (!email) return { name: 'Nico', initials: 'N' };
  const local = email.split('@')[0] ?? 'Nico';
  const name = local.charAt(0).toUpperCase() + local.slice(1);
  const initials = name.charAt(0).toUpperCase();
  return { name, initials };
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const projection = await getWeightProjection(supabase, user.id);

  const data: DashboardData = {
    series: projection.series.map((p) => ({
      event_id: p.event_id,
      occurred_at: p.occurred_at.toISOString(),
      kg: p.kg,
      corrected: p.corrected,
    })),
    latest: projection.latest
      ? {
          event_id: projection.latest.event_id,
          occurred_at: projection.latest.occurred_at.toISOString(),
          kg: projection.latest.kg,
          corrected: projection.latest.corrected,
        }
      : null,
    trend7d: projection.trend7d,
    trend14d: projection.trend14d,
    trend7dChangeKg: projection.trend7dChangeKg,
  };

  const { name, initials } = deriveNameAndInitials(user.email);

  return <Dashboard data={data} userName={name} initials={initials} />;
}
