import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContextSection } from '../types';

const PANTRY_CONTEXT_LIMIT = 12;

interface PantryRow {
  label: string;
  brand: string | null;
  kcal_per_100g: number | null;
  last_used_at: string | null;
}

function formatNumber(n: number): string {
  return Math.round(n).toString();
}

// Aktive Pantry-Items des Nutzers (Top-N, sortiert nach Last-Used). Liefert
// dem Chat genug Vokabular, um auf vage Lebensmittel-Erwähnungen mit einer
// gezielten Rückfrage zu reagieren („Meinst du Kölln Müsli Schoko aus deinem
// Vorrat?"), bevor er log_meal aufruft.
export async function getPantryContext(
  client: SupabaseClient,
  userId: string,
): Promise<UserContextSection> {
  // Vor dem Read das Lazy-Aging anstoßen — analog zur /api/pantry-Route.
  // Items, die seit >90 Tagen nicht genutzt wurden, fallen aus dem aktiven Set
  // und tauchen damit nicht mehr im Chat-Kontext auf.
  void userId;
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  await client
    .from('pantry_items')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('is_archived', false)
    .lt('last_used_at', cutoff);

  const { data, error } = await client
    .from('pantry_items')
    .select('label, brand, kcal_per_100g, last_used_at')
    .eq('is_archived', false)
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .limit(PANTRY_CONTEXT_LIMIT);

  if (error || !data || data.length === 0) {
    return {
      domain: 'nutrition.pantry',
      label: 'Vorrat',
      available: false,
      summary:
        'Noch keine Pantry-Einträge. Wenn der Nutzer ein Markenprodukt erwähnt, kannst du es per log_meal mit eigener Schätzung loggen — eine Pantry-Bibliothek baut sich automatisch über Barcode-Scans im MealComposer auf.',
    };
  }

  const rows = data as PantryRow[];
  const lines: string[] = [];
  lines.push(`- Aktive Pantry-Einträge (Top ${rows.length}):`);
  for (const r of rows) {
    const brand = r.brand ? `${r.brand} ` : '';
    const kcal = r.kcal_per_100g !== null ? ` — ${formatNumber(r.kcal_per_100g)} kcal/100g` : '';
    lines.push(`  - „${brand}${r.label}"${kcal}`);
  }
  lines.push(
    '- Wichtig: Wenn der Nutzer ein vages Lebensmittel erwähnt („Müsli", „Joghurt", „Riegel") und einer dieser Einträge passen könnte, frage zur Bestätigung („Meinst du …?") BEVOR du log_meal aufrufst. Beim klaren Match: nutze lookup_pantry für Details und log_meal mit `pantry_item_id`, damit die Mahlzeit den Bezug behält und der Vorrat hochgezählt wird.',
  );

  return {
    domain: 'nutrition.pantry',
    label: 'Vorrat',
    available: true,
    summary: lines.join('\n'),
  };
}
