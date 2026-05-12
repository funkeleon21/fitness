import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    type: text('type').notNull(),
    version: integer('version').notNull(),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull(),
    recorded_at: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    source: text('source').notNull(),
    confidence: real('confidence'),
    raw_input: text('raw_input'),
    payload: jsonb('payload').notNull(),
  },
  (t) => [
    index('idx_events_user_type').on(t.user_id, t.type),
    index('idx_events_user_occurred_at').on(t.user_id, t.occurred_at),
    pgPolicy('events_select_own', {
      for: 'select',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('events_insert_own', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`user_id = (select auth.uid())`,
    }),
  ],
).enableRLS();
