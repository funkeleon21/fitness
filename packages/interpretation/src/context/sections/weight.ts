import { getWeightProjection } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContextSection } from '../types';

function formatKg(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export async function getWeightContext(
  client: SupabaseClient,
  userId: string,
): Promise<UserContextSection> {
  const projection = await getWeightProjection(client, userId);

  if (!projection.latest || projection.series.length === 0) {
    return {
      domain: 'body.weight',
      label: 'Gewicht',
      available: false,
      summary: 'Noch keine Gewichts-Einträge.',
    };
  }

  const lines: string[] = [];
  lines.push(
    `- Letzter Eintrag: ${formatKg(projection.latest.kg)} kg am ${formatDate(projection.latest.occurred_at)}`,
  );

  if (projection.trend7d !== null) {
    lines.push(`- 7-Tage-Durchschnitt: ${formatKg(projection.trend7d)} kg`);
  } else {
    lines.push('- 7-Tage-Durchschnitt: zu wenige Einträge in den letzten 7 Tagen');
  }

  if (projection.trend14d !== null) {
    lines.push(`- 14-Tage-Durchschnitt: ${formatKg(projection.trend14d)} kg`);
  }

  if (projection.trend7dChangeKg !== null) {
    const sign = projection.trend7dChangeKg > 0 ? '+' : '';
    lines.push(
      `- Veränderung 7d-Schnitt gegenüber den 7 Tagen davor: ${sign}${formatKg(projection.trend7dChangeKg)} kg`,
    );
  }

  const oldest = projection.series[0];
  if (oldest) {
    lines.push(
      `- Datenbasis: ${projection.series.length} Einträge, ältester am ${formatDate(oldest.occurred_at)}`,
    );
  }

  return {
    domain: 'body.weight',
    label: 'Gewicht',
    available: true,
    summary: lines.join('\n'),
  };
}
