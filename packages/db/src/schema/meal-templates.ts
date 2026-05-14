import { sql } from 'drizzle-orm';
import {
  integer,
  pgPolicy,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const mealTemplates = pgTable(
  'meal_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    label: text('label').notNull(),
    kcal: real('kcal').notNull(),
    protein_g: real('protein_g'),
    carbs_g: real('carbs_g'),
    fat_g: real('fat_g'),
    sugar_g: real('sugar_g'),
    fiber_g: real('fiber_g'),
    saturated_fat_g: real('saturated_fat_g'),
    salt_g: real('salt_g'),
    usage_count: integer('usage_count').notNull().default(0),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uniq_meal_templates_user_label').on(t.user_id, t.label),
    pgPolicy('meal_templates_select_own', {
      for: 'select',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('meal_templates_insert_own', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('meal_templates_update_own', {
      for: 'update',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('meal_templates_delete_own', {
      for: 'delete',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
  ],
).enableRLS();
