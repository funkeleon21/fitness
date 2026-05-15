import {
  getWorkoutProjection,
  getWorkoutTemplate,
  listWorkoutTemplates,
  recordWorkoutTemplateUsage,
} from '@fitness/db';
import { logWorkout, retractEvent } from '@fitness/ingestion';
import { tool } from 'ai';
import { z } from 'zod';
import { toolExternalId, toolProvenance, toolRawInput } from '../provenance';
import type { ChatToolset } from '../types';

// Schema-Form passt 1:1 auf packages/core/src/events/training/workout.ts.
// Bewusst hier nochmal definiert (statt importiert), weil das LLM die
// .describe()-Texte sieht und sie eng am Verwendungs-Kontext stehen.
const setInputSchema = z.object({
  reps: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .nullable()
    .describe('Wiederholungen. null wenn unbekannt.'),
  weight_kg: z
    .number()
    .min(0)
    .max(1000)
    .nullable()
    .describe('Gewicht in kg. null bei Körpergewichts-Übungen oder Cardio.'),
  rpe: z
    .number()
    .min(0)
    .max(10)
    .nullable()
    .describe('Rate of Perceived Exertion 0–10. null wenn nicht angegeben.'),
  note: z
    .string()
    .max(200)
    .nullable()
    .describe('Notiz, z.B. „60s halten" oder „Warm-up". null wenn keine.'),
});

const exerciseInputSchema = z.object({
  name: z.string().min(1).max(200).describe('Name der Übung, z.B. „Bankdrücken".'),
  sets: z
    .array(setInputSchema)
    .min(1)
    .max(50)
    .describe(
      'Mindestens ein Satz pro Übung. Bei Cardio wäre ein einzelner Satz mit note="60s" o.ä.',
    ),
  note: z.string().max(500).nullable().describe('Übungs-spezifische Notiz. null wenn keine.'),
});

// Wandelt das LLM-Schema (mit null statt undefined) ins Event-Format.
function exercisesToEventPayload(input: Array<z.infer<typeof exerciseInputSchema>>): Array<{
  name: string;
  sets: Array<{ reps?: number; weight_kg?: number; rpe?: number; note?: string }>;
  note?: string;
}> {
  return input.map((ex) => ({
    name: ex.name,
    sets: ex.sets.map((s) => ({
      ...(s.reps !== null ? { reps: s.reps } : {}),
      ...(s.weight_kg !== null ? { weight_kg: s.weight_kg } : {}),
      ...(s.rpe !== null ? { rpe: s.rpe } : {}),
      ...(s.note !== null ? { note: s.note } : {}),
    })),
    ...(ex.note !== null ? { note: ex.note } : {}),
  }));
}

export const workoutTools: ChatToolset = ({ client, userId }) => ({
  log_workout: tool({
    description:
      'Trage eine Trainingseinheit ein. Verwende dies, wenn der Nutzer beschreibt, was er trainiert hat (z.B. „Push-Day: Bankdrücken 80×8, 80×7, 75×6, dann Schulterdrücken 30×10, 30×10"). Wenn der Nutzer eine bekannte Vorlage erwähnt („mein Standard-Push-Day"), nutze stattdessen log_workout_from_template. Der Nutzer bestätigt den Eintrag über die UI bevor er geschrieben wird.',
    inputSchema: z.object({
      label: z
        .string()
        .min(1)
        .max(200)
        .describe('Bezeichnung der Einheit, z.B. „Push-Day", „5 km Lauf", „Mobility".'),
      duration_min: z
        .number()
        .min(0)
        .max(600)
        .nullable()
        .describe('Gesamtdauer in Minuten. null wenn der Nutzer nichts dazu sagt — nicht raten.'),
      exercises: z
        .array(exerciseInputSchema)
        .max(30)
        .nullable()
        .describe(
          'Übungen mit Sätzen. null oder leeres Array bei reinen Cardio-Einheiten (z.B. „5 km Lauf"), wo Label + Dauer reichen.',
        ),
      occurred_at: z
        .string()
        .datetime()
        .nullable()
        .describe(
          'ISO-Zeitpunkt des Trainingsstarts. „heute Morgen" → heute ~08:00, „nach der Arbeit" → heute ~18:00. null = jetzt.',
        ),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe(
          'Deine Konfidenz, dass die Extraktion (Gewichte/Wdh./Übungen) korrekt ist (0–1).',
        ),
      raw_input: z
        .string()
        .nullish()
        .describe(
          'Originale Nutzerformulierung, aus der du das Training extrahiert hast. null nur, wenn nicht rekonstruierbar.',
        ),
    }),
    needsApproval: true,
    execute: async ({ label, duration_min, exercises, occurred_at, confidence, raw_input }) => {
      const occurredAt = occurred_at ? new Date(occurred_at) : new Date();
      const exercisePayload =
        exercises && exercises.length > 0 ? exercisesToEventPayload(exercises) : undefined;
      const sourceInput = toolRawInput(raw_input, {
        tool: 'log_workout',
        label,
        duration_min,
        exercises,
        occurred_at,
      });
      const result = await logWorkout(client, {
        user_id: userId,
        label,
        duration_min: duration_min ?? undefined,
        exercises: exercisePayload,
        occurred_at: occurredAt,
        source: 'ai-extracted',
        external_id: toolExternalId('log_workout', {
          label,
          duration_min,
          exercises,
          occurred_at,
          raw_input: sourceInput,
        }),
        raw_input: sourceInput,
        confidence,
        provenance: toolProvenance(sourceInput),
      });
      return {
        ok: true,
        event_id: result.event_id,
        label,
        exercise_count: exercisePayload?.length ?? 0,
        occurred_at: occurredAt.toISOString(),
      };
    },
  }),

  list_recent_workouts: tool({
    description:
      'Liste die letzten Trainings-Einträge des Nutzers inkl. event_id, Datum, Label, Übungs-Anzahl und Satz-Anzahl. Nutze dies BEVOR du retract_workout aufrufst, um die richtige event_id zu finden. Auch hilfreich bei Fragen wie „was hab ich diese Woche trainiert".',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .describe('Wie viele letzte Einträge zurückgeben (1–20).'),
    }),
    execute: async ({ limit }) => {
      const projection = await getWorkoutProjection(client, userId);
      const entries = projection.recent.slice(0, limit).map((w) => {
        const setCount = w.exercises?.reduce((acc, ex) => acc + ex.sets.length, 0) ?? 0;
        return {
          event_id: w.event_id,
          occurred_at: w.occurred_at.toISOString(),
          label: w.label,
          duration_min: w.duration_min,
          exercise_count: w.exercises?.length ?? 0,
          set_count: setCount,
          corrected: w.corrected,
        };
      });
      return { entries, this_week: projection.thisWeekTotals };
    },
  }),

  retract_workout: tool({
    description:
      'Ziehe einen Trainings-Eintrag zurück (Soft-Delete). Verwende für „lösch das Training", „der Eintrag stimmt nicht", versehentliche Einträge. Nutze list_recent_workouts zuerst, um die richtige event_id zu finden. Der Nutzer bestätigt die Aktion über die UI.',
    inputSchema: z.object({
      event_id: z.string().uuid().describe('UUID des zurückzuziehenden Trainings-Eintrags.'),
      reason: z
        .string()
        .nullable()
        .describe(
          'Optional: Grund (z.B. „versehentlich", „falsche Übung"). null wenn nicht angegeben.',
        ),
      raw_input: z
        .string()
        .nullish()
        .describe('Originale Nutzerformulierung. null nur, wenn nicht rekonstruierbar.'),
    }),
    needsApproval: true,
    execute: async ({ event_id, reason, raw_input }) => {
      const sourceInput = toolRawInput(raw_input, {
        tool: 'retract_workout',
        event_id,
        reason,
      });
      const result = await retractEvent(client, {
        user_id: userId,
        retracts_event_id: event_id,
        reason: reason ?? 'chat retraction',
        source: 'ai-extracted',
        external_id: toolExternalId('retract_workout', {
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

  list_workout_templates: tool({
    description:
      'Liste die gespeicherten Trainings-Vorlagen des Nutzers (Workout Memory). Nutze dies, wenn der Nutzer ein wiederkehrendes Training erwähnt („mein Push-Day", „die übliche Beine-Einheit"), um die passende Vorlage zu identifizieren.',
    inputSchema: z.object({}),
    execute: async () => {
      const templates = await listWorkoutTemplates(client, userId);
      return {
        templates: templates.map((t) => ({
          id: t.id,
          label: t.label,
          exercise_count: t.exercises.length,
          set_count: t.exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
          default_duration_min: t.default_duration_min,
          usage_count: t.usage_count,
        })),
      };
    },
  }),

  log_workout_from_template: tool({
    description:
      'Trage eine Trainingseinheit aus einer Vorlage ein, mit den heutigen Gewichten/Wdh. überschrieben. Verwende dies, wenn der Nutzer eine bekannte Vorlage erwähnt UND konkrete Gewichte/Wdh. mitliefert („mein Push-Day heute, Bankdrücken 80×8, 80×7"). Bei reinem „Vorlage X" ohne Werte ist log_workout_from_template auch ok — dann nutze die Default-Wdh. der Vorlage und lass Gewichte leer. Identifiziere die Vorlage vorher via list_workout_templates.',
    inputSchema: z.object({
      template_id: z
        .string()
        .uuid()
        .describe('UUID der zu nutzenden Vorlage (aus list_workout_templates).'),
      label: z
        .string()
        .min(1)
        .max(200)
        .nullable()
        .describe(
          'Optionales Override-Label (z.B. „Push-Day (heavy)"). null = Label der Vorlage übernehmen.',
        ),
      duration_min: z
        .number()
        .min(0)
        .max(600)
        .nullable()
        .describe('Gesamtdauer in Minuten. null = Default-Dauer der Vorlage oder weglassen.'),
      exercises: z
        .array(exerciseInputSchema)
        .max(30)
        .nullable()
        .describe(
          'Mit aktuellen Gewichten/Wdh. überschriebene Übungen. null = nur Vorlagen-Struktur ohne Werte loggen.',
        ),
      occurred_at: z
        .string()
        .datetime()
        .nullable()
        .describe('ISO-Zeitpunkt des Trainingsstarts. null = jetzt.'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('Deine Konfidenz, dass die Vorlagen-Identifikation und Übungs-Werte stimmen.'),
      raw_input: z
        .string()
        .nullish()
        .describe('Originale Nutzerformulierung. null nur, wenn nicht rekonstruierbar.'),
    }),
    needsApproval: true,
    execute: async ({
      template_id,
      label,
      duration_min,
      exercises,
      occurred_at,
      confidence,
      raw_input,
    }) => {
      const tpl = await getWorkoutTemplate(client, userId, template_id);
      if (!tpl) {
        throw new Error(`Vorlage ${template_id} nicht gefunden.`);
      }
      const occurredAt = occurred_at ? new Date(occurred_at) : new Date();
      const exercisePayload =
        exercises && exercises.length > 0 ? exercisesToEventPayload(exercises) : tpl.exercises;
      const sourceInput = toolRawInput(raw_input, {
        tool: 'log_workout_from_template',
        template_id,
        exercises,
        occurred_at,
      });
      const result = await logWorkout(client, {
        user_id: userId,
        label: label ?? tpl.label,
        duration_min: duration_min ?? tpl.default_duration_min ?? undefined,
        exercises: exercisePayload,
        template_id: tpl.id,
        occurred_at: occurredAt,
        source: 'ai-extracted',
        external_id: toolExternalId('log_workout_from_template', {
          template_id,
          exercises,
          occurred_at,
          raw_input: sourceInput,
        }),
        raw_input: sourceInput,
        confidence,
        provenance: toolProvenance(sourceInput),
      });
      await recordWorkoutTemplateUsage(client, userId, tpl.id, occurredAt);
      return {
        ok: true,
        event_id: result.event_id,
        template_label: tpl.label,
        label: label ?? tpl.label,
        occurred_at: occurredAt.toISOString(),
      };
    },
  }),
});
