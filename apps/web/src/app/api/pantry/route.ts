import { wrapApiHandler } from '@/lib/api/handler';
import { jsonResponse } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// CRUD für die persönliche Zutaten-Bibliothek.
// GET: Aktive oder archivierte Items, sortiert nach last_used_at desc.
//      Lazy-Aging: vor Rückgabe werden aktive Items mit last_used_at < now()-90d
//      auf is_archived=true gesetzt. Kein Cron, kein Background-Job — ein
//      Single-User-System lebt mit dem kleinen Extra-Tick beim Listen-Aufruf.
// POST: Manuelles Anlegen eines Items.
export const runtime = 'nodejs';

const AGING_DAYS = 90;

export interface PantryItemDto {
  id: string;
  label: string;
  brand: string | null;
  kcal_per_100g: number | null;
  protein_g_per_100g: number | null;
  carbs_g_per_100g: number | null;
  fat_g_per_100g: number | null;
  sugar_g_per_100g: number | null;
  fiber_g_per_100g: number | null;
  saturated_fat_g_per_100g: number | null;
  salt_g_per_100g: number | null;
  serving_size_g: number | null;
  first_seen_at: string;
  last_used_at: string | null;
  use_count: number;
  is_archived: boolean;
  barcode_count: number;
}

const createSchema = z.object({
  label: z.string().min(1).max(200),
  brand: z.string().max(120).nullable().optional(),
  kcal_per_100g: z.number().nullable().optional(),
  protein_g_per_100g: z.number().nullable().optional(),
  carbs_g_per_100g: z.number().nullable().optional(),
  fat_g_per_100g: z.number().nullable().optional(),
  sugar_g_per_100g: z.number().nullable().optional(),
  fiber_g_per_100g: z.number().nullable().optional(),
  saturated_fat_g_per_100g: z.number().nullable().optional(),
  salt_g_per_100g: z.number().nullable().optional(),
  serving_size_g: z.number().nullable().optional(),
  // Optionaler Barcode-Alias: wenn der Lookup für einen Code keinen
  // OFF-Treffer hatte, kann der Nutzer das Item manuell anlegen und der
  // gescannte Code wird trotzdem an pantry_barcodes gehängt — der nächste
  // Scan trifft dann den Pantry-Cache.
  barcode: z
    .string()
    .min(6)
    .max(20)
    .regex(/^\d+$/, 'Barcode muss eine reine Ziffernfolge sein')
    .optional(),
});

export const GET = wrapApiHandler('pantry-get', async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: 'Nicht angemeldet' }, 401);

  const url = new URL(req.url);
  const archived = url.searchParams.get('archived') === 'true';

  // Lazy-Aging: aktive Items, die seit AGING_DAYS Tagen ungenutzt sind, archivieren.
  // Wird nur bei der Aktiv-Liste ausgeführt — wer das Archiv öffnet, kennt schon
  // den Effekt.
  if (!archived) {
    const cutoff = new Date(Date.now() - AGING_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('pantry_items')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('is_archived', false)
      .lt('last_used_at', cutoff);
  }

  const { data: items, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('is_archived', archived)
    .order('last_used_at', { ascending: false, nullsFirst: false });

  if (error) return jsonResponse({ error: error.message }, 500);

  const ids = (items ?? []).map((i) => i.id as string);
  let countsByItem = new Map<string, number>();
  if (ids.length > 0) {
    const { data: codes } = await supabase
      .from('pantry_barcodes')
      .select('pantry_item_id')
      .in('pantry_item_id', ids);
    countsByItem = (codes ?? []).reduce((acc, row) => {
      const k = row.pantry_item_id as string;
      acc.set(k, (acc.get(k) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
  }

  const result: PantryItemDto[] = (items ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    brand: row.brand,
    kcal_per_100g: row.kcal_per_100g,
    protein_g_per_100g: row.protein_g_per_100g,
    carbs_g_per_100g: row.carbs_g_per_100g,
    fat_g_per_100g: row.fat_g_per_100g,
    sugar_g_per_100g: row.sugar_g_per_100g,
    fiber_g_per_100g: row.fiber_g_per_100g,
    saturated_fat_g_per_100g: row.saturated_fat_g_per_100g,
    salt_g_per_100g: row.salt_g_per_100g,
    serving_size_g: row.serving_size_g,
    first_seen_at: row.first_seen_at,
    last_used_at: row.last_used_at,
    use_count: row.use_count,
    is_archived: row.is_archived,
    barcode_count: countsByItem.get(row.id) ?? 0,
  }));

  return jsonResponse({ items: result });
});

export const POST = wrapApiHandler('pantry-post', async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonResponse({ error: 'Nicht angemeldet' }, 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ error: 'Ungueltiger JSON-Body' }, 400);
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: 'Ungueltige Eingabe', issues: parsed.error.issues }, 400);
  }

  const insert = await supabase
    .from('pantry_items')
    .insert({
      user_id: user.id,
      label: parsed.data.label,
      brand: parsed.data.brand ?? null,
      kcal_per_100g: parsed.data.kcal_per_100g ?? null,
      protein_g_per_100g: parsed.data.protein_g_per_100g ?? null,
      carbs_g_per_100g: parsed.data.carbs_g_per_100g ?? null,
      fat_g_per_100g: parsed.data.fat_g_per_100g ?? null,
      sugar_g_per_100g: parsed.data.sugar_g_per_100g ?? null,
      fiber_g_per_100g: parsed.data.fiber_g_per_100g ?? null,
      saturated_fat_g_per_100g: parsed.data.saturated_fat_g_per_100g ?? null,
      salt_g_per_100g: parsed.data.salt_g_per_100g ?? null,
      serving_size_g: parsed.data.serving_size_g ?? null,
    })
    .select('*')
    .single();

  if (insert.error || !insert.data) {
    return jsonResponse({ error: insert.error?.message ?? 'Insert fehlgeschlagen' }, 500);
  }

  let barcodeCount = 0;
  if (parsed.data.barcode) {
    const aliasInsert = await supabase
      .from('pantry_barcodes')
      .insert({ user_id: user.id, pantry_item_id: insert.data.id, barcode: parsed.data.barcode });
    if (aliasInsert.error) {
      // Item ist bereits angelegt — Barcode-Konflikt (z.B. doppelter Scan) ist
      // kein Grund, das Item zu verwerfen. Wir geben den Item-Datensatz trotzdem
      // zurück und der Nutzer kann den Code im Edit-Sheet später nachpflegen.
      return jsonResponse({
        item: { ...insert.data, barcode_count: 0 },
        barcode_error: aliasInsert.error.message,
      });
    }
    barcodeCount = 1;
  }

  return jsonResponse({ item: { ...insert.data, barcode_count: barcodeCount } });
});
