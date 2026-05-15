import { z } from 'zod';
import { eventEnvelopeBaseSchema, validateEventEnvelope } from '../envelope';

export const WORKOUT_LOGGED = 'workout_logged' as const;

// Eine einzelne Wiederholungs-Serie innerhalb einer Übung. Alle Felder sind
// optional — Cardio-/Mobility-Übungen ("Plank 60s", "5min Rudergerät") werden
// dann nur über `note` beschrieben. Krafttraining nutzt reps + weight_kg + ggf. rpe.
export const workoutSetSchema = z.object({
  reps: z.number().int().min(0).max(1000).optional(),
  weight_kg: z.number().min(0).max(1000).optional(),
  // RPE: Rate of Perceived Exertion, 0–10. Optional, weil nur Krafttrainer das
  // konsequent loggen.
  rpe: z.number().min(0).max(10).optional(),
  note: z.string().max(200).optional(),
});
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const workoutExerciseSchema = z.object({
  name: z.string().min(1).max(200),
  sets: z.array(workoutSetSchema).min(1).max(50),
  note: z.string().max(500).optional(),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const workoutLoggedPayloadSchema = z.object({
  // Frei wählbar — z.B. "Push-Day", "Beine", "5km Lauf". UI rendert das groß
  // im Verlauf, analog zum Mahlzeit-Label.
  label: z.string().min(1).max(200),
  // Gesamtdauer in Minuten. Optional, weil nicht immer relevant/gemessen.
  duration_min: z.number().min(0).max(600).optional(),
  // Übungen mit Sätzen. Bei reinen Cardio-Einheiten (5km Lauf) bleibt das leer
  // oder fehlt ganz — label + duration_min reichen dann.
  exercises: z.array(workoutExerciseSchema).max(30).optional(),
  // ID einer workout_templates-Zeile, falls die Einheit aus einer Vorlage
  // entstanden ist. Inhalte (exercises) sind trotzdem als Snapshot im Payload
  // — Templates können sich ändern.
  template_id: z.string().uuid().optional(),
});
export type WorkoutLoggedPayload = z.infer<typeof workoutLoggedPayloadSchema>;

export const workoutLoggedEventSchema = eventEnvelopeBaseSchema
  .extend({
    type: z.literal(WORKOUT_LOGGED),
    version: z.literal(1),
    payload: workoutLoggedPayloadSchema,
  })
  .superRefine(validateEventEnvelope);
export type WorkoutLoggedEvent = z.infer<typeof workoutLoggedEventSchema>;
