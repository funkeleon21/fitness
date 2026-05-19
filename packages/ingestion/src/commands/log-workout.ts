import {
  type EventProvenance,
  type EventSource,
  type WorkoutExercise,
  type WorkoutMood,
  createWorkoutLogged,
  workoutLoggedEventSchema,
} from '@fitness/core';
import { appendEvent } from '@fitness/db';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LogWorkoutInput {
  user_id: string;
  label: string;
  occurred_at: Date;
  duration_min?: number;
  exercises?: WorkoutExercise[];
  mood?: WorkoutMood;
  note?: string;
  template_id?: string;
  source?: EventSource;
  external_id?: string | null;
  raw_input?: string | null;
  confidence?: number | null;
  provenance?: EventProvenance | null;
}

export async function logWorkout(
  client: SupabaseClient,
  input: LogWorkoutInput,
): Promise<{ event_id: string }> {
  const event = createWorkoutLogged({
    user_id: input.user_id,
    label: input.label,
    occurred_at: input.occurred_at,
    duration_min: input.duration_min,
    exercises: input.exercises,
    mood: input.mood,
    note: input.note,
    template_id: input.template_id,
    source: input.source ?? 'manual',
    external_id: input.external_id ?? null,
    raw_input: input.raw_input ?? null,
    confidence: input.confidence ?? null,
    provenance: input.provenance ?? null,
  });

  const parsed = workoutLoggedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new Error(`Ungueltiges Workout-Event: ${parsed.error.message}`);
  }

  return appendEvent(client, parsed.data);
}
