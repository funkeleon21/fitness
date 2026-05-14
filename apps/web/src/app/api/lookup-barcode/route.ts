import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Open-Food-Facts-Lookup. Gratis, kein API-Key. Wir wrappen es serverseitig fuer
// Auth-Check und damit der Browser nicht mit der externen API spricht (CORS, Logging).
export const runtime = 'nodejs';

export interface BarcodeLookupResult {
  found: boolean;
  barcode: string;
  label: string | null;
  brand: string | null;
  serving_size_g: number | null;
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
  status: number; // 1 = found, 0 = not found
  product?: OffProduct;
}

// "200 g" / "30g" / "1 portion (50g)" → 200/30/50. null wenn nicht parsebar.
function parseServingSizeGrams(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  if (!match || !match[1]) return null;
  const n = Number(match[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n < 5000 ? n : null;
}

function numOrNull(v: number | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : null;
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Nicht angemeldet' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({ code: url.searchParams.get('code') ?? '' });
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Ungueltiger Barcode', issues: parsed.error.issues }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }
    const code = parsed.data.code;

    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`, {
      headers: {
        'user-agent': 'Labor-Fitness/1.0 (https://fitness-web-self-three.vercel.app)',
      },
    });
    if (!offRes.ok) {
      return new Response(
        JSON.stringify({ error: `Open Food Facts antwortete mit ${offRes.status}` }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      );
    }

    const offBody = (await offRes.json()) as OffResponse;
    if (offBody.status !== 1 || !offBody.product) {
      const empty: BarcodeLookupResult = {
        found: false,
        barcode: code,
        label: null,
        brand: null,
        serving_size_g: null,
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
      };
      return new Response(JSON.stringify({ result: empty }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const p = offBody.product;
    const n = p.nutriments ?? {};
    const label = p.product_name_de?.trim() || p.product_name?.trim() || null;
    const brand = p.brands?.split(',')[0]?.trim() || null;

    const result: BarcodeLookupResult = {
      found: true,
      barcode: code,
      label,
      brand,
      serving_size_g: parseServingSizeGrams(p.serving_size),
      nutrients_per_100g: {
        kcal: numOrNull(n['energy-kcal_100g']),
        protein_g: numOrNull(n.proteins_100g),
        carbs_g: numOrNull(n.carbohydrates_100g),
        fat_g: numOrNull(n.fat_100g),
        sugar_g: numOrNull(n.sugars_100g),
        fiber_g: numOrNull(n.fiber_100g),
        saturated_fat_g: numOrNull(n['saturated-fat_100g']),
        salt_g: numOrNull(n.salt_100g),
      },
    };

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
