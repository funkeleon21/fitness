CREATE TABLE IF NOT EXISTS "pantry_barcodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pantry_item_id" uuid NOT NULL,
	"barcode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pantry_barcodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"brand" text,
	"kcal_per_100g" real,
	"protein_g_per_100g" real,
	"carbs_g_per_100g" real,
	"fat_g_per_100g" real,
	"sugar_g_per_100g" real,
	"fiber_g_per_100g" real,
	"saturated_fat_g_per_100g" real,
	"salt_g_per_100g" real,
	"serving_size_g" real,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"use_count" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pantry_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pantry_barcodes" ADD CONSTRAINT "pantry_barcodes_pantry_item_id_pantry_items_id_fk" FOREIGN KEY ("pantry_item_id") REFERENCES "public"."pantry_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_pantry_barcodes_user_barcode" ON "pantry_barcodes" USING btree ("user_id","barcode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pantry_items_user_last_used" ON "pantry_items" USING btree ("user_id","last_used_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pantry_items_user_label" ON "pantry_items" USING btree ("user_id","label");--> statement-breakpoint
CREATE POLICY "pantry_barcodes_select_own" ON "pantry_barcodes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pantry_barcodes_insert_own" ON "pantry_barcodes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pantry_barcodes_update_own" ON "pantry_barcodes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pantry_barcodes_delete_own" ON "pantry_barcodes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pantry_items_select_own" ON "pantry_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pantry_items_insert_own" ON "pantry_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pantry_items_update_own" ON "pantry_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "pantry_items_delete_own" ON "pantry_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = (select auth.uid()));