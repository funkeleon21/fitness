CREATE TABLE IF NOT EXISTS "meal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kcal" real NOT NULL,
	"protein_g" real,
	"carbs_g" real,
	"fat_g" real,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_meal_templates_user_label" ON "meal_templates" USING btree ("user_id","label");--> statement-breakpoint
CREATE POLICY "meal_templates_select_own" ON "meal_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "meal_templates_insert_own" ON "meal_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "meal_templates_update_own" ON "meal_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "meal_templates_delete_own" ON "meal_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = (select auth.uid()));