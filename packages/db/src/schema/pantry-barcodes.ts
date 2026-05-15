import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pantryItems } from './pantry-items';

// n-Barcodes → 1 Pantry-Item. Verschiedene Packungsgrößen desselben Produkts
// (z.B. 500 g vs. 1 kg Müsli) tragen unterschiedliche EANs, sollen aber auf
// denselben Pantry-Eintrag zeigen. `(user_id, barcode)` ist unique, weil der
// gleiche Code für denselben Nutzer eindeutig auf ein Produkt verweist.
export const pantryBarcodes = pgTable(
  'pantry_barcodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    pantry_item_id: uuid('pantry_item_id')
      .notNull()
      .references(() => pantryItems.id, { onDelete: 'cascade' }),
    barcode: text('barcode').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uniq_pantry_barcodes_user_barcode').on(t.user_id, t.barcode),
    pgPolicy('pantry_barcodes_select_own', {
      for: 'select',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('pantry_barcodes_insert_own', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('pantry_barcodes_update_own', {
      for: 'update',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
      withCheck: sql`user_id = (select auth.uid())`,
    }),
    pgPolicy('pantry_barcodes_delete_own', {
      for: 'delete',
      to: 'authenticated',
      using: sql`user_id = (select auth.uid())`,
    }),
  ],
).enableRLS();
