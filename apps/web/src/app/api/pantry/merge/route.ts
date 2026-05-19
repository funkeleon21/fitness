import { wrapApiHandler } from '@/lib/api/handler';
import { jsonResponse } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Merge: zwei Pantry-Items zu einem zusammenführen. Alle Barcodes vom
// Quell-Item ziehen auf das Ziel-Item um (RLS + (user_id, barcode) unique
// halten alles eindeutig), danach Quelle löschen. Kein Auto-Merge per Heuristik
// — der User bestätigt im UI vorher explizit.
export const runtime = 'nodejs';

const mergeSchema = z.object({
  source_id: z.string().uuid('source_id muss eine UUID sein'),
  target_id: z.string().uuid('target_id muss eine UUID sein'),
});

export const POST = wrapApiHandler('pantry-merge', async (req: Request) => {
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

  const parsed = mergeSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: 'Ungueltige Eingabe', issues: parsed.error.issues }, 400);
  }

  const { source_id, target_id } = parsed.data;
  if (source_id === target_id) {
    return jsonResponse({ error: 'Quelle und Ziel müssen unterschiedlich sein' }, 400);
  }

  // Beide Items laden, um Existenz und User-Zugehörigkeit (via RLS) zu prüfen.
  const both = await supabase
    .from('pantry_items')
    .select('id, use_count, last_used_at')
    .in('id', [source_id, target_id]);

  if (both.error) return jsonResponse({ error: both.error.message }, 500);
  if (!both.data || both.data.length !== 2) {
    return jsonResponse({ error: 'Ein Item wurde nicht gefunden' }, 404);
  }

  const source = both.data.find((r) => r.id === source_id);
  const target = both.data.find((r) => r.id === target_id);
  if (!source || !target) {
    return jsonResponse({ error: 'Quelle/Ziel nicht eindeutig' }, 500);
  }

  // Barcodes von Quelle auf Ziel umziehen. Die (user_id, barcode)-Unique-Constraint
  // verhindert Duplikate falls beide Items denselben Code hatten — selten, aber
  // möglich (z.B. wenn vor der App-Logik schon zwei Items existieren). Im seltenen
  // Konfliktfall werden betroffene Quell-Barcodes mit dem Cascade-Delete der
  // Quelle entsorgt.
  const updBarcodes = await supabase
    .from('pantry_barcodes')
    .update({ pantry_item_id: target_id })
    .eq('pantry_item_id', source_id);

  // Konflikt: Zielen es bereits einen Barcode mit demselben Code? Dann landet
  // der Update für die betroffene Zeile als Error. Wir ignorieren das hier,
  // weil das Cascade-Delete weiter unten den Rest aufräumt.
  if (updBarcodes.error && updBarcodes.error.code !== '23505') {
    return jsonResponse({ error: updBarcodes.error.message }, 500);
  }

  // Use-Count + Last-Used-Vereinigung — die größere Aktivität gewinnt.
  const combinedUseCount = (source.use_count ?? 0) + (target.use_count ?? 0);
  const combinedLastUsed = [source.last_used_at, target.last_used_at]
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);

  const updTarget = await supabase
    .from('pantry_items')
    .update({
      use_count: combinedUseCount,
      last_used_at: combinedLastUsed ?? null,
      is_archived: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', target_id);
  if (updTarget.error) return jsonResponse({ error: updTarget.error.message }, 500);

  // Quelle entfernen. CASCADE räumt verbliebene pantry_barcodes mit ab.
  const delSource = await supabase.from('pantry_items').delete().eq('id', source_id);
  if (delSource.error) return jsonResponse({ error: delSource.error.message }, 500);

  return jsonResponse({ ok: true, target_id });
});
