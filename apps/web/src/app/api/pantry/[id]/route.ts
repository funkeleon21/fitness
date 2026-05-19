import { wrapApiHandler } from '@/lib/api/handler';
import { jsonResponse } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const runtime = 'nodejs';

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
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
  is_archived: z.boolean().optional(),
});

const uuidSchema = z.string().uuid('Pantry-ID muss eine UUID sein');

export const PATCH = wrapApiHandler(
  'pantry-id-patch',
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: 'Nicht angemeldet' }, 401);

    const { id: idParam } = await ctx.params;
    const idCheck = uuidSchema.safeParse(idParam);
    if (!idCheck.success) return jsonResponse({ error: 'Ungueltige ID' }, 400);
    const id = idCheck.data;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonResponse({ error: 'Ungueltiger JSON-Body' }, 400);
    }

    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonResponse({ error: 'Ungueltige Eingabe', issues: parsed.error.issues }, 400);
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) patch[k] = v;
    }

    const upd = await supabase.from('pantry_items').update(patch).eq('id', id).select('*').single();
    if (upd.error || !upd.data) {
      return jsonResponse({ error: upd.error?.message ?? 'Update fehlgeschlagen' }, 500);
    }

    return jsonResponse({ item: upd.data });
  },
);

export const DELETE = wrapApiHandler(
  'pantry-id-delete',
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonResponse({ error: 'Nicht angemeldet' }, 401);

    const { id: idParam } = await ctx.params;
    const idCheck = uuidSchema.safeParse(idParam);
    if (!idCheck.success) return jsonResponse({ error: 'Ungueltige ID' }, 400);
    const id = idCheck.data;

    // CASCADE räumt zugehörige pantry_barcodes mit ab. RLS sorgt für User-Filter.
    const del = await supabase.from('pantry_items').delete().eq('id', id);
    if (del.error) return jsonResponse({ error: del.error.message }, 500);

    return jsonResponse({ ok: true });
  },
);
