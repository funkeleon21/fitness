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
  uuid,
} from 'drizzle-orm/pg-core';

// Persönliche Zutaten-Bibliothek („Pantry"). Ein Eintrag pro Produkt — mehrere
// Barcodes (verschiedene Packungsgrößen desselben Produkts) zeigen über die
// Tabelle `pantry_barcodes` auf dieselbe Zeile hier. Nährwerte werden konsistent
// pro 100 g gehalten (OFF-Konvention), Portionsgrößen optional als Hinweis.
//
// Materialization, kein Event-Sourcing: gefüllt durch Barcode-Scans (OFF) und
// manuelle Pflege im PantrySheet. `meal_logged`-Events tragen die `pantry_item_id`
// optional im Payload, damit der Replay den Bezug nachvollziehen kann.
export const pantryItems = pgTable(
  'pantry_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    label: text('label').notNull(),
    brand: text('brand'),
    kcal_per_100g: real('kcal_per_100g'),
    protein_g_per_100g: real('protein_g_per_100g'),
    carbs_g_per_100g: real('carbs_g_per_100g'),
    fat_g_per_100g: real('fat_g_per_100g'),
    sugar_g_per_100g: real('sugar_g_per_100g'),
    fiber_g_per_100g: real('fiber_g_per_100g'),
    saturated_fat_g_per_100g: real('saturated_fat_g_per_100g'),
    salt_g_per_100g: real('salt_g_per_100g'),
    serving_size_g: real('serving_size_g'),
    first_seen_at: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    use_count: integer('use_count').notNull().default(0),
    is_archived: boolean('is_archived').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Lookup-Pfad fürs PantrySheet (aktive Items sortiert nach Last-Used).
    index('idx_pantry_items_user_last_used').on(t.user_id, t.last_used_at),
    // Ähnlichkeits-/Duplikat-Suche nach Label (case-insensitive in der App-Logik).
    index('idx_pantry_items_user_label').on(t.user_id, t.label),
    pgPolicy('pantry_items_select_own', {
      for: 'select',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('pantry_items_insert_own', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('pantry_items_update_own', {
      for: 'update',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('pantry_items_delete_own', {
      for: 'delete',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
  ],
).enableRLS();
