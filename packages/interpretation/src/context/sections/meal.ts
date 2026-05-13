import { getMealProjection, listMealTemplates } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContextSection } from '../types';

function formatNumber(n: number, decimals = 0): string {
  return n.toFixed(decimals).replace('.', ',');
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export async function getMealContext(
  client: SupabaseClient,
  userId: string,
): Promise<UserContextSection> {
  // Projektion + Templates parallel laden.
  const [projection, templates] = await Promise.all([
    getMealProjection(client, userId),
    listMealTemplates(client, userId),
  ]);

  if (projection.recent.length === 0 && templates.length === 0) {
    return {
      domain: 'nutrition.meals',
      label: 'Ernährung',
      available: false,
      summary: 'Noch keine Mahlzeit-Einträge.',
    };
  }

  const lines: string[] = [];

  // Heute — Tagessumme + Mahlzeiten-Liste.
  if (projection.today.length > 0) {
    const t = projection.todayTotals;
    const macros = [
      `${formatNumber(t.kcal)} kcal`,
      t.protein_g > 0 ? `P ${formatNumber(t.protein_g)} g` : null,
      t.carbs_g > 0 ? `K ${formatNumber(t.carbs_g)} g` : null,
      t.fat_g > 0 ? `F ${formatNumber(t.fat_g)} g` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    lines.push(`- Heute: ${macros} (${t.count} ${t.count === 1 ? 'Mahlzeit' : 'Mahlzeiten'})`);

    for (const meal of projection.today) {
      const conf =
        meal.confidence !== null && meal.confidence < 0.9
          ? ` (Konfidenz ${meal.confidence.toFixed(2).replace('.', ',')})`
          : '';
      const protein = meal.protein_g !== null ? `, P ${formatNumber(meal.protein_g)} g` : '';
      lines.push(
        `  - ${formatTime(meal.occurred_at)} ${meal.label} — ${formatNumber(meal.kcal)} kcal${protein}${conf}`,
      );
    }
  } else {
    lines.push('- Heute: noch keine Mahlzeit erfasst.');
  }

  // Letzte Mahlzeiten vor heute (kompakt, max 3) — gibt dem Chat Kontext für
  // „gestern Abend"-Fragen, ohne den Prompt zu sprengen.
  const firstToday = projection.today[0];
  const beforeToday = firstToday
    ? projection.recent.filter((m) => m.occurred_at.getTime() < firstToday.occurred_at.getTime())
    : projection.recent;
  if (beforeToday.length > 0) {
    lines.push('- Davor (letzte Einträge):');
    for (const meal of beforeToday.slice(0, 3)) {
      lines.push(
        `  - ${formatDate(meal.occurred_at)} ${formatTime(meal.occurred_at)} ${meal.label} — ${formatNumber(meal.kcal)} kcal`,
      );
    }
  }

  // Food-Memory / Templates — gibt dem Chat das Vokabular für „mein Standard-Frühstück".
  if (templates.length > 0) {
    const top = templates
      .slice(0, 6)
      .map((t) => `„${t.label}"`)
      .join(', ');
    lines.push(`- Bekannte Mahlzeit-Vorlagen (${templates.length}): ${top}`);
  }

  // Datenbasis & ehrliche Trend-Lücke.
  lines.push(`- Datenbasis: ${projection.recent.length} erfasste Mahlzeit-Einträge (letzte 20).`);
  lines.push(
    '- Hinweis: Wochenschnitte/Trends sind in dieser Domäne noch nicht aktiv — Aussagen über „typische Tageswerte" daher zurückhaltend formulieren.',
  );

  return {
    domain: 'nutrition.meals',
    label: 'Ernährung',
    available: true,
    summary: lines.join('\n'),
  };
}
