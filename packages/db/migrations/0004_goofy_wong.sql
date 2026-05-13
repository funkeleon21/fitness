CREATE TABLE IF NOT EXISTS "body_state" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"latest_event_id" uuid,
	"latest_occurred_at" timestamp with time zone,
	"latest_weight_kg" real,
	"trend7d_kg" real,
	"trend14d_kg" real,
	"trend7d_change_kg" real,
	"weight_entry_count" integer DEFAULT 0 NOT NULL,
	"rebuilt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "body_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weight_series" (
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"kg" real NOT NULL,
	"source" text NOT NULL,
	"confidence" real,
	"raw_input" text,
	"corrected" boolean DEFAULT false NOT NULL,
	"rebuilt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weight_series" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_weight_series_user_event" ON "weight_series" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_weight_series_user_occurred_at" ON "weight_series" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE POLICY "body_state_select_own" ON "body_state" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "body_state_insert_own" ON "body_state" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "body_state_update_own" ON "body_state" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "body_state_delete_own" ON "body_state" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "weight_series_select_own" ON "weight_series" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "weight_series_insert_own" ON "weight_series" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "weight_series_update_own" ON "weight_series" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "weight_series_delete_own" ON "weight_series" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = (select auth.uid()));