import { sql } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Workout-Vorlagen halten nur die STRUKTUR einer Trainingseinheit (welche Übungen,
// wie viele Sätze, Default-Werte). Gewichte/Wdh. tippt der Nutzer beim Loggen
// jedes Mal frisch ein — ein eingefrorenes Gewicht-Default wäre veraltet, sobald
// Progressive Overload greift.
//
// `exercises` ist als JSONB modelliert und folgt formatmäßig dem Workout-Event-
// Schema (Array<{ name, sets[]: { reps?, weight_kg?, rpe?, note? }, note? }>).
// Damit ist es vom Log-Sheet direkt wiederverwendbar — Validierung beim Lesen
// erfolgt im Repository über workoutExerciseSchema aus @fitness/core.
export const workoutTemplates = pgTable(
  'workout_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    label: text('label').notNull(),
    exercises: jsonb('exercises').notNull().default(sql`'[]'::jsonb`),
    // Optionale Default-Dauer in Minuten. Im UI vorausgefüllt, vom Nutzer
    // jederzeit überschreibbar.
    default_duration_min: integer('default_duration_min'),
    usage_count: integer('usage_count').notNull().default(0),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uniq_workout_templates_user_label').on(t.user_id, t.label),
    pgPolicy('workout_templates_select_own', {
      for: 'select',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('workout_templates_insert_own', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('workout_templates_update_own', {
      for: 'update',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('workout_templates_delete_own', {
      for: 'delete',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
  ],
).enableRLS();
