import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgPolicy,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const weightSeries = pgTable(
  'weight_series',
  {
    user_id: uuid('user_id').notNull(),
    event_id: uuid('event_id').notNull(),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull(),
    kg: real('kg').notNull(),
    source: text('source').notNull(),
    confidence: real('confidence'),
    raw_input: text('raw_input'),
    corrected: boolean('corrected').notNull().default(false),
    rebuilt_at: timestamp('rebuilt_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uniq_weight_series_user_event').on(t.user_id, t.event_id),
    index('idx_weight_series_user_occurred_at').on(t.user_id, t.occurred_at),
    pgPolicy('weight_series_select_own', {
      for: 'select',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('weight_series_insert_own', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('weight_series_update_own', {
      for: 'update',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('weight_series_delete_own', {
      for: 'delete',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const bodyState = pgTable(
  'body_state',
  {
    user_id: uuid('user_id').primaryKey(),
    latest_event_id: uuid('latest_event_id'),
    latest_occurred_at: timestamp('latest_occurred_at', { withTimezone: true }),
    latest_weight_kg: real('latest_weight_kg'),
    trend7d_kg: real('trend7d_kg'),
    trend14d_kg: real('trend14d_kg'),
    trend7d_change_kg: real('trend7d_change_kg'),
    weight_entry_count: integer('weight_entry_count').notNull().default(0),
    rebuilt_at: timestamp('rebuilt_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy('body_state_select_own', {
      for: 'select',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('body_state_insert_own', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('body_state_update_own', {
      for: 'update',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('body_state_delete_own', {
      for: 'delete',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
  ],
).enableRLS();
