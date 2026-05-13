import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
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
    external_id: text('external_id'),
    confidence: real('confidence'),
    raw_input: text('raw_input'),
    provenance: jsonb('provenance'),
    payload: jsonb('payload').notNull(),
  },
  (t) => [
    index('idx_events_user_type').on(t.user_id, t.type),
    index('idx_events_user_occurred_at').on(t.user_id, t.occurred_at),
    index('idx_events_user_recorded_at').on(t.user_id, t.recorded_at),
    uniqueIndex('uniq_events_user_source_external_id')
      .on(t.user_id, t.source, t.external_id)
      .where(sql`${t.external_id} is not null`),
    check(
      'chk_events_confidence_range',
      sql`${t.confidence} is null or (${t.confidence} >= 0 and ${t.confidence} <= 1)`,
    ),
    check(
      'chk_events_ai_extracted_provenance',
      sql`${t.source} <> 'ai-extracted' or (
        ${t.confidence} is not null
        and nullif(btrim(${t.raw_input}), '') is not null
        and ${t.provenance} is not null
        and nullif(btrim(${t.provenance}->>'model'), '') is not null
        and nullif(btrim(${t.provenance}->>'prompt_hash'), '') is not null
      )`,
    ),
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
