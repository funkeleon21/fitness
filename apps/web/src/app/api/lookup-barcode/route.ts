import { wrapApiHandler } from '@/lib/api/handler';
import { jsonResponse } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Cache-First-Barcode-Lookup. Erst Pantry (eigene Bibliothek des Nutzers),
// dann erst Open Food Facts als Quelle. So funktioniert Scan auch bei
// OFF-Outage für alle Produkte, die der Nutzer schon mal gescannt hat.
// Treffer aus OFF werden direkt in die Pantry materialisiert.
export const runtime = 'nodejs';

export type BarcodeLookupSource = 'pantry' | 'off' | 'off-alias';

export interface PantrySimilarItem {
  id: string;
  label: string;
  brand: string | null;
}

export interface BarcodeLookupResult {
  found: boolean;
  source: BarcodeLookupSource | null;
  barcode: string;
  pantry_item_id: string | null;
  label: string | null;
  brand: string | null;
  serving_size_g: number | null;
  last_used_at: string | null;
  nutrients_per_100g: {
    kcal: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    sugar_g: number | null;
    fiber_g: number | null;
    saturated_fat_g: number | null;
    salt_g: number | null;
  };
  // Nur bei source='off' (neues Item angelegt) gefüllt: andere aktive Pantry-Items
  // mit ähnlichem Label, die der Nutzer zum Mergen vorgeschlagen bekommt.
  // Auto-Merge ist explizit nicht erlaubt — der Nutzer bestätigt im UI.
  similar_pantry_items: PantrySimilarItem[];
}

const querySchema = z.object({
  code: z.string().min(6).max(20).regex(/^\d+$/, 'Barcode muss eine reine Ziffernfolge sein'),
});

interface OffNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  'saturated-fat_100g'?: number;
  salt_100g?: number;
}

interface OffProduct {
  product_name?: string;
  product_name_de?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: OffNutriments;
}

interface OffResponse {
  status: number;
  product?: OffProduct;
}

interface PantryItemRow {
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
  last_used_at: string | null;
  use_count: number;
  is_archived: boolean;
}

const OFF_BASE_URL = process.env.OFF_BASE_URL ?? 'https://world.openfoodfacts.org';
const OFF_TIMEOUT_MS = 4000;
const OFF_RETRY_BACKOFF_MS = 400;

function parseServingSizeGrams(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  if (!match || !match[1]) return null;
  const n = Number(match[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 5000 ? n : null;
}

function numOrNull(v: number | undefined | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
}

function normaliseForMatch(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function pantryRowToResult(
  row: PantryItemRow,
  source: BarcodeLookupSource,
  barcode: string,
  similar: PantrySimilarItem[] = [],
): BarcodeLookupResult {
  return {
    found: true,
    source,
    barcode,
    pantry_item_id: row.id,
    label: row.label,
    brand: row.brand,
    serving_size_g: row.serving_size_g,
    last_used_at: row.last_used_at,
    nutrients_per_100g: {
      kcal: row.kcal_per_100g,
      protein_g: row.protein_g_per_100g,
      carbs_g: row.carbs_g_per_100g,
      fat_g: row.fat_g_per_100g,
      sugar_g: row.sugar_g_per_100g,
      fiber_g: row.fiber_g_per_100g,
      saturated_fat_g: row.saturated_fat_g_per_100g,
      salt_g: row.salt_g_per_100g,
    },
    similar_pantry_items: similar,
  };
}

// Fuzzy-Ähnlichkeit über Token-Overlap. Bewusst simpel — Token-Jaccard reicht
// für „Müsli Schoko" vs. „Schoko-Müsli" als Auslöser. Eine Levenshtein-Lösung
// wäre besser für Typos, aber der Confirm-Dialog ist ohnehin nur Vorschlag.
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(' ')
      .filter((t) => t.length >= 3),
  );
}

function tokensOverlap(a: string, b: string): boolean {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return false;
  let common = 0;
  for (const t of A) if (B.has(t)) common++;
  // Mindestens ein nicht-trivialer Treffer, der nicht nur Stoppwörter sind.
  return common >= 1;
}

// OFF-Call mit Timeout + 1 Retry bei 5xx. Wirft bei Netzwerkfehler/Timeout/Server-Error.
async function fetchFromOpenFoodFacts(code: string): Promise<OffResponse | null> {
  const url = `${OFF_BASE_URL}/api/v2/product/${code}.json`;
  const headers = {
    'user-agent': 'Labor-Fitness/1.0 (https://fitness-web-self-three.vercel.app)',
  };

  async function once(): Promise<Response> {
    return fetch(url, { headers, signal: AbortSignal.timeout(OFF_TIMEOUT_MS) });
  }

  let res: Response;
  try {
    res = await once();
    if (res.status >= 500) {
      await new Promise((r) => setTimeout(r, OFF_RETRY_BACKOFF_MS));
      res = await once();
    }
  } catch {
    // Timeout/Netzwerk. Genau ein Retry mit Backoff.
    await new Promise((r) => setTimeout(r, OFF_RETRY_BACKOFF_MS));
    res = await once();
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Open Food Facts antwortete mit ${res.status}`);
  }
  return (await res.json()) as OffResponse;
}

export const GET = wrapApiHandler('lookup-barcode', async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonResponse({ error: 'Nicht angemeldet' }, 401);
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ code: url.searchParams.get('code') ?? '' });
  if (!parsed.success) {
    return jsonResponse({ error: 'Ungueltiger Barcode', issues: parsed.error.issues }, 400);
  }
  const code = parsed.data.code;

  // 1) Cache-Hit? Pantry-Barcode + zugehöriges Item laden. RLS filtert User automatisch.
  const cacheLookup = await supabase
    .from('pantry_barcodes')
    .select('pantry_item_id, pantry_items(*)')
    .eq('barcode', code)
    .maybeSingle();

  if (cacheLookup.error && cacheLookup.error.code !== 'PGRST116') {
    return jsonResponse({ error: cacheLookup.error.message }, 500);
  }

  const cachedItem = cacheLookup.data?.pantry_items as PantryItemRow | null | undefined;
  if (cachedItem) {
    // Side-Effect: Last-Used + Use-Count anheben, ggf. reaktivieren.
    await supabase
      .from('pantry_items')
      .update({
        last_used_at: new Date().toISOString(),
        use_count: cachedItem.use_count + 1,
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cachedItem.id);

    const refreshed: PantryItemRow = {
      ...cachedItem,
      last_used_at: new Date().toISOString(),
      use_count: cachedItem.use_count + 1,
      is_archived: false,
    };
    return jsonResponse({ result: pantryRowToResult(refreshed, 'pantry', code) });
  }

  // 2) Kein Cache-Hit → OFF anfragen. Bei Outage → 503 mit DE-Text.
  let off: OffResponse | null;
  try {
    off = await fetchFromOpenFoodFacts(code);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unbekannt';
    return jsonResponse(
      {
        error:
          "Open Food Facts ist gerade nicht erreichbar — versuch's gleich nochmal oder leg das Produkt manuell an.",
        reason,
      },
      503,
    );
  }

  if (!off || off.status !== 1 || !off.product) {
    const empty: BarcodeLookupResult = {
      found: false,
      source: null,
      barcode: code,
      pantry_item_id: null,
      label: null,
      brand: null,
      serving_size_g: null,
      last_used_at: null,
      nutrients_per_100g: {
        kcal: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        sugar_g: null,
        fiber_g: null,
        saturated_fat_g: null,
        salt_g: null,
      },
      similar_pantry_items: [],
    };
    return jsonResponse({ result: empty });
  }

  const p = off.product;
  const n = p.nutriments ?? {};
  const label = (p.product_name_de?.trim() || p.product_name?.trim()) ?? null;
  const brand = p.brands?.split(',')[0]?.trim() || null;
  const servingSize = parseServingSizeGrams(p.serving_size);
  const nutrients = {
    kcal_per_100g: numOrNull(n['energy-kcal_100g']),
    protein_g_per_100g: numOrNull(n.proteins_100g),
    carbs_g_per_100g: numOrNull(n.carbohydrates_100g),
    fat_g_per_100g: numOrNull(n.fat_100g),
    sugar_g_per_100g: numOrNull(n.sugars_100g),
    fiber_g_per_100g: numOrNull(n.fiber_100g),
    saturated_fat_g_per_100g: numOrNull(n['saturated-fat_100g']),
    salt_g_per_100g: numOrNull(n.salt_100g),
  };

  if (!label) {
    // OFF kennt den Code, hat aber keinen Namen → kein sinnvolles Pantry-Item.
    const empty: BarcodeLookupResult = {
      found: false,
      source: null,
      barcode: code,
      pantry_item_id: null,
      label: null,
      brand,
      serving_size_g: servingSize,
      last_used_at: null,
      nutrients_per_100g: {
        kcal: nutrients.kcal_per_100g,
        protein_g: nutrients.protein_g_per_100g,
        carbs_g: nutrients.carbs_g_per_100g,
        fat_g: nutrients.fat_g_per_100g,
        sugar_g: nutrients.sugar_g_per_100g,
        fiber_g: nutrients.fiber_g_per_100g,
        saturated_fat_g: nutrients.saturated_fat_g_per_100g,
        salt_g: nutrients.salt_g_per_100g,
      },
      similar_pantry_items: [],
    };
    return jsonResponse({ result: empty });
  }

  // 3) Pantry-Item für denselben User mit gleichem (label, brand) finden — case-insensitive.
  // Sequence statt funktionalem Index, weil die App ohnehin die Kandidaten lädt
  // (kleine Pantry pro Nutzer, max. ein paar hundert Items).
  const existingLookup = await supabase
    .from('pantry_items')
    .select(
      'id, label, brand, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugar_g_per_100g, fiber_g_per_100g, saturated_fat_g_per_100g, salt_g_per_100g, serving_size_g, last_used_at, use_count, is_archived',
    )
    .ilike('label', label);

  const candidates = (existingLookup.data ?? []) as PantryItemRow[];
  const targetLabel = normaliseForMatch(label);
  const targetBrand = normaliseForMatch(brand);
  const exactMatch = candidates.find(
    (c) => normaliseForMatch(c.label) === targetLabel && normaliseForMatch(c.brand) === targetBrand,
  );

  if (exactMatch) {
    // Nur Barcode-Alias anhängen + Use-Count anheben.
    await supabase
      .from('pantry_barcodes')
      .insert({ user_id: user.id, pantry_item_id: exactMatch.id, barcode: code });

    await supabase
      .from('pantry_items')
      .update({
        last_used_at: new Date().toISOString(),
        use_count: exactMatch.use_count + 1,
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exactMatch.id);

    const refreshed: PantryItemRow = {
      ...exactMatch,
      last_used_at: new Date().toISOString(),
      use_count: exactMatch.use_count + 1,
      is_archived: false,
    };
    return jsonResponse({ result: pantryRowToResult(refreshed, 'off-alias', code) });
  }

  // 4) Neuer Pantry-Eintrag + Barcode-Alias.
  const insertItem = await supabase
    .from('pantry_items')
    .insert({
      user_id: user.id,
      label,
      brand,
      ...nutrients,
      serving_size_g: servingSize,
      first_seen_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      use_count: 1,
    })
    .select(
      'id, label, brand, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugar_g_per_100g, fiber_g_per_100g, saturated_fat_g_per_100g, salt_g_per_100g, serving_size_g, last_used_at, use_count, is_archived',
    )
    .single();

  if (insertItem.error || !insertItem.data) {
    return jsonResponse(
      { error: insertItem.error?.message ?? 'Konnte Pantry-Eintrag nicht anlegen' },
      500,
    );
  }

  const newItem = insertItem.data as PantryItemRow;
  const insertAlias = await supabase
    .from('pantry_barcodes')
    .insert({ user_id: user.id, pantry_item_id: newItem.id, barcode: code });

  if (insertAlias.error) {
    return jsonResponse({ error: insertAlias.error.message }, 500);
  }

  // Ähnliche aktive Pantry-Items für Merge-Vorschlag suchen (Confirm-Dialog im UI).
  // Wir laden alle aktiven Items des Users (mit Ausnahme des neuen) und filtern
  // clientseitig per Token-Overlap. Bei einer kleinen Pantry pro Nutzer kostet
  // das nichts; bei größeren Mengen wäre ein pg_trgm-Index die saubere Lösung.
  const candidatesForMerge = await supabase
    .from('pantry_items')
    .select('id, label, brand')
    .eq('is_archived', false)
    .neq('id', newItem.id);
  const similar: PantrySimilarItem[] = (candidatesForMerge.data ?? [])
    .filter((c) => tokensOverlap(c.label, label))
    .slice(0, 5)
    .map((c) => ({
      id: c.id as string,
      label: c.label as string,
      brand: c.brand as string | null,
    }));

  return jsonResponse({ result: pantryRowToResult(newItem, 'off', code, similar) });
});
