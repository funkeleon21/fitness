import {
  getMealProjection,
  getMealTemplate,
  listMealTemplates,
  recordMealTemplateUsage,
} from '@fitness/db';
import { logMeal, retractEvent } from '@fitness/ingestion';
import { tool } from 'ai';
import { z } from 'zod';
import { toolExternalId, toolProvenance, toolRawInput } from '../provenance';
import type { ChatToolset } from '../types';

export const mealTools: ChatToolset = ({ client, userId }) => ({
  log_meal: tool({
    description:
      'Trage eine Mahlzeit ein. Verwende dies, wenn der Nutzer beschreibt, was er gegessen hat (z.B. „Mittag war Hähnchen mit Reis, ca. 600 kcal"). Wenn der Nutzer ein bekanntes Standard-Gericht erwähnt („mein Standard-Frühstück"), nutze stattdessen log_meal_from_template. Der Nutzer bestätigt den Eintrag über die UI bevor er geschrieben wird.',
    inputSchema: z.object({
      label: z
        .string()
        .min(1)
        .max(200)
        .describe('Kurze Bezeichnung der Mahlzeit, z.B. „Haferflocken mit Beeren und Skyr".'),
      kcal: z
        .number()
        .min(0)
        .max(20000)
        .describe('Geschätzte Kalorien gesamt. Wenn unsicher, eher konservativ schätzen.'),
      protein_g: z
        .number()
        .min(0)
        .max(2000)
        .nullable()
        .describe('Protein in Gramm. null wenn unbekannt.'),
      carbs_g: z
        .number()
        .min(0)
        .max(2000)
        .nullable()
        .describe('Kohlenhydrate in Gramm. null wenn unbekannt.'),
      fat_g: z.number().min(0).max(2000).nullable().describe('Fett in Gramm. null wenn unbekannt.'),
      sugar_g: z
        .number()
        .min(0)
        .max(2000)
        .nullable()
        .describe(
          'Zucker in Gramm (Teilmenge der Kohlenhydrate). null wenn nicht abschätzbar — z.B. bei Mischgerichten oder ohne Verpackungs-Angabe.',
        ),
      fiber_g: z
        .number()
        .min(0)
        .max(2000)
        .nullable()
        .describe(
          'Ballaststoffe in Gramm. null wenn nicht abschätzbar. Bei Vollkorn/Gemüse-lastigen Gerichten gerne abschätzen.',
        ),
      saturated_fat_g: z
        .number()
        .min(0)
        .max(2000)
        .nullable()
        .describe(
          'Gesättigte Fettsäuren in Gramm (Teilmenge von fat_g). null wenn nicht abschätzbar.',
        ),
      salt_g: z
        .number()
        .min(0)
        .max(200)
        .nullable()
        .describe(
          'Salz in Gramm. null wenn nicht abschätzbar. Bei Fast-Food/Fertiggerichten realistisch hoch (2–5g).',
        ),
      meal_type: z
        .enum(['breakfast', 'lunch', 'dinner', 'snack'])
        .nullable()
        .describe(
          'Slot der Mahlzeit. Setze nur, wenn der Nutzer es explizit erwähnt ("mein Frühstück", "Snack"). Sonst null — UI leitet den Slot aus occurred_at ab.',
        ),
      pantry_item_id: z
        .string()
        .uuid()
        .nullable()
        .describe(
          'UUID eines Pantry-Eintrags, falls der Nutzer dir ein konkretes Produkt aus seinem Vorrat bestätigt hat. Sehr wichtig: NIE raten. Setze diese ID nur, wenn der Nutzer auf deine Rückfrage („Meinst du Kölln Müsli Schoko aus deinem Vorrat?") explizit zugestimmt hat. Sonst null. Bei vagen Eingaben wie „ich hatte Müsli" zuerst per lookup_pantry suchen und rückfragen, statt diese ID zu raten.',
        ),
      occurred_at: z
        .string()
        .datetime()
        .nullable()
        .describe(
          'ISO-8601-Zeitpunkt der Mahlzeit. Bei „Mittag" → heute ~12:30, „Frühstück" → heute ~08:00, „Abendessen" → heute ~19:00. null = jetzt.',
        ),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe(
          'Deine Konfidenz, dass kcal/Makros sinnvoll geschätzt sind (0–1). Niedrig bei vagen Angaben, hoch bei klaren Mengen/Marken.',
        ),
      raw_input: z
        .string()
        .nullish()
        .describe(
          'Originale Nutzerformulierung, aus der du die Mahlzeit extrahiert hast. null nur, wenn nicht rekonstruierbar.',
        ),
    }),
    needsApproval: true,
    execute: async ({
      label,
      kcal,
      protein_g,
      carbs_g,
      fat_g,
      sugar_g,
      fiber_g,
      saturated_fat_g,
      salt_g,
      meal_type,
      pantry_item_id,
      occurred_at,
      confidence,
      raw_input,
    }) => {
      const occurredAt = occurred_at ? new Date(occurred_at) : new Date();
      const sourceInput = toolRawInput(raw_input, {
        tool: 'log_meal',
        label,
        kcal,
        protein_g,
        carbs_g,
        fat_g,
        sugar_g,
        fiber_g,
        saturated_fat_g,
        salt_g,
        meal_type,
        pantry_item_id,
        occurred_at,
      });
      const result = await logMeal(client, {
        user_id: userId,
        label,
        kcal,
        protein_g: protein_g ?? undefined,
        carbs_g: carbs_g ?? undefined,
        fat_g: fat_g ?? undefined,
        sugar_g: sugar_g ?? undefined,
        fiber_g: fiber_g ?? undefined,
        saturated_fat_g: saturated_fat_g ?? undefined,
        salt_g: salt_g ?? undefined,
        meal_type: meal_type ?? undefined,
        pantry_item_id: pantry_item_id ?? undefined,
        occurred_at: occurredAt,
        source: 'ai-extracted',
        external_id: toolExternalId('log_meal', {
          label,
          kcal,
          protein_g,
          carbs_g,
          fat_g,
          sugar_g,
          fiber_g,
          saturated_fat_g,
          salt_g,
          meal_type,
          pantry_item_id,
          occurred_at,
          raw_input: sourceInput,
        }),
        raw_input: sourceInput,
        confidence,
        provenance: toolProvenance(sourceInput),
      });
      // Pantry-Use-Tracking analog zur saveComposedMealAction. RLS filtert User.
      if (pantry_item_id) {
        const { data: row } = await client
          .from('pantry_items')
          .select('use_count')
          .eq('id', pantry_item_id)
          .maybeSingle();
        await client
          .from('pantry_items')
          .update({
            use_count: (row?.use_count ?? 0) + 1,
            last_used_at: new Date().toISOString(),
            is_archived: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pantry_item_id);
      }
      return {
        ok: true,
        event_id: result.event_id,
        label,
        kcal,
        occurred_at: occurredAt.toISOString(),
        pantry_item_id: pantry_item_id ?? null,
      };
    },
  }),

  lookup_pantry: tool({
    description:
      'Suche nach Einträgen in der persönlichen Zutaten-Bibliothek (Pantry) des Nutzers. Verwende dies, wenn der Nutzer ein vages Lebensmittel/Markenprodukt erwähnt („Müsli", „Joghurt", „der Riegel den ich immer habe") und du wissen willst, ob er einen passenden Pantry-Eintrag besitzt — BEVOR du log_meal aufrufst. Bei einem oder mehreren Treffern: frag zur Bestätigung („Meinst du …?"), übernimm dann pantry_item_id ins log_meal. Bei keinem Treffer: log_meal mit eigener Schätzung.',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .max(120)
        .describe(
          'Such-String — wird gegen Label und Marke gematcht (case-insensitive Substring). Halt es knapp, z.B. „müsli", „joghurt", „kölln".',
        ),
    }),
    execute: async ({ query }) => {
      const q = `%${query.trim().replace(/[%_]/g, '\\$&')}%`;
      const labelMatches = await client
        .from('pantry_items')
        .select(
          'id, label, brand, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, serving_size_g, last_used_at, use_count',
        )
        .eq('is_archived', false)
        .ilike('label', q)
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .limit(10);

      const brandMatches = await client
        .from('pantry_items')
        .select(
          'id, label, brand, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, serving_size_g, last_used_at, use_count',
        )
        .eq('is_archived', false)
        .ilike('brand', q)
        .order('last_used_at', { ascending: false, nullsFirst: false })
        .limit(10);

      const seen = new Set<string>();
      const merged: Record<string, unknown>[] = [];
      for (const row of [...(labelMatches.data ?? []), ...(brandMatches.data ?? [])]) {
        const id = row.id as string;
        if (seen.has(id)) continue;
        seen.add(id);
        merged.push(row);
        if (merged.length >= 10) break;
      }
      return { matches: merged };
    },
  }),

  list_recent_meal_entries: tool({
    description:
      'Liste die letzten Mahlzeit-Einträge des Nutzers inkl. event_id, Datum/Uhrzeit, Label und kcal. Nutze dies BEVOR du retract_meal aufrufst, um die richtige event_id zu finden. Auch hilfreich, um Tagesverlauf-Fragen zu beantworten.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .describe('Wie viele letzte Einträge zurückgeben (1–20).'),
    }),
    execute: async ({ limit }) => {
      const projection = await getMealProjection(client, userId);
      const entries = projection.recent.slice(0, limit).map((m) => ({
        event_id: m.event_id,
        occurred_at: m.occurred_at.toISOString(),
        label: m.label,
        kcal: m.kcal,
        protein_g: m.protein_g,
        carbs_g: m.carbs_g,
        fat_g: m.fat_g,
        corrected: m.corrected,
      }));
      return { entries };
    },
  }),

  retract_meal: tool({
    description:
      'Ziehe einen Mahlzeit-Eintrag zurück (Soft-Delete). Verwende für „lösch das Mittag", „der Eintrag stimmt nicht", versehentliche Einträge. Nutze list_recent_meal_entries zuerst, um die richtige event_id zu finden. Der Nutzer bestätigt die Aktion über die UI.',
    inputSchema: z.object({
      event_id: z.string().uuid().describe('UUID des zurückzuziehenden Mahlzeit-Eintrags.'),
      reason: z
        .string()
        .nullable()
        .describe(
          'Optional: Grund (z.B. „versehentlich eingetragen", „falsche Menge"). null wenn nicht angegeben.',
        ),
      raw_input: z
        .string()
        .nullish()
        .describe(
          'Originale Nutzerformulierung, aus der du die Retraction abgeleitet hast. null nur, wenn nicht rekonstruierbar.',
        ),
    }),
    needsApproval: true,
    execute: async ({ event_id, reason, raw_input }) => {
      const sourceInput = toolRawInput(raw_input, { tool: 'retract_meal', event_id, reason });
      const result = await retractEvent(client, {
        user_id: userId,
        retracts_event_id: event_id,
        reason: reason ?? 'chat retraction',
        source: 'ai-extracted',
        external_id: toolExternalId('retract_meal', {
          event_id,
          reason,
          raw_input: sourceInput,
        }),
        raw_input: sourceInput,
        confidence: 0.9,
        provenance: toolProvenance(sourceInput),
      });
      return { ok: true, event_id: result.event_id, retracts_event_id: event_id };
    },
  }),

  list_meal_templates: tool({
    description:
      'Liste die gespeicherten Mahlzeit-Vorlagen des Nutzers (Food Memory). Nutze dies, wenn der Nutzer ein wiederkehrendes Gericht erwähnt („mein Standard-Frühstück", „die übliche Bowl"), um die passende Vorlage zu identifizieren.',
    inputSchema: z.object({}),
    execute: async () => {
      const templates = await listMealTemplates(client, userId);
      return {
        templates: templates.map((t) => ({
          id: t.id,
          label: t.label,
          kcal: t.kcal,
          protein_g: t.protein_g,
          carbs_g: t.carbs_g,
          fat_g: t.fat_g,
          slot: t.slot,
          usage_count: t.usage_count,
        })),
      };
    },
  }),

  log_meal_from_template: tool({
    description:
      'Trage eine Mahlzeit aus einer bekannten Vorlage ein. Verwende dies, wenn der Nutzer ein wiederkehrendes Gericht erwähnt und du die passende Vorlage via list_meal_templates identifiziert hast. Spart Schätzungs-Aufwand und referenziert das Template (template_id wird mit gespeichert). Bei Mehrdeutigkeit lieber nachfragen statt raten.',
    inputSchema: z.object({
      template_id: z
        .string()
        .uuid()
        .describe('UUID der zu nutzenden Vorlage (aus list_meal_templates).'),
      occurred_at: z
        .string()
        .datetime()
        .nullable()
        .describe('ISO-Zeitpunkt der Mahlzeit. null = jetzt.'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Deine Konfidenz, dass die gewählte Vorlage tatsächlich die gemeinte ist (0–1).'),
      raw_input: z
        .string()
        .nullish()
        .describe(
          'Originale Nutzerformulierung, aus der du die Vorlage erkannt hast. null nur, wenn nicht rekonstruierbar.',
        ),
    }),
    needsApproval: true,
    execute: async ({ template_id, occurred_at, confidence, raw_input }) => {
      const tpl = await getMealTemplate(client, userId, template_id);
      if (!tpl) {
        throw new Error(`Vorlage ${template_id} nicht gefunden.`);
      }
      const occurredAt = occurred_at ? new Date(occurred_at) : new Date();
      const sourceInput = toolRawInput(raw_input, {
        tool: 'log_meal_from_template',
        template_id,
        occurred_at,
      });
      const result = await logMeal(client, {
        user_id: userId,
        label: tpl.label,
        kcal: tpl.kcal,
        protein_g: tpl.protein_g ?? undefined,
        carbs_g: tpl.carbs_g ?? undefined,
        fat_g: tpl.fat_g ?? undefined,
        sugar_g: tpl.sugar_g ?? undefined,
        fiber_g: tpl.fiber_g ?? undefined,
        saturated_fat_g: tpl.saturated_fat_g ?? undefined,
        salt_g: tpl.salt_g ?? undefined,
        template_id: tpl.id,
        meal_type: tpl.slot ?? undefined,
        occurred_at: occurredAt,
        source: 'ai-extracted',
        external_id: toolExternalId('log_meal_from_template', {
          template_id,
          occurred_at,
          raw_input: sourceInput,
        }),
        raw_input: sourceInput,
        confidence,
        provenance: toolProvenance(sourceInput),
      });
      await recordMealTemplateUsage(client, userId, tpl.id, occurredAt);
      return {
        ok: true,
        event_id: result.event_id,
        label: tpl.label,
        kcal: tpl.kcal,
        occurred_at: occurredAt.toISOString(),
      };
    },
  }),
});
