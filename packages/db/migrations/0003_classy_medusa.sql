ALTER TABLE "events" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "provenance" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_user_recorded_at" ON "events" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_events_user_source_external_id" ON "events" USING btree ("user_id","source","external_id") WHERE "events"."external_id" is not null;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "chk_events_confidence_range" CHECK ("events"."confidence" is null or ("events"."confidence" >= 0 and "events"."confidence" <= 1));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "chk_events_ai_extracted_provenance" CHECK ("events"."source" <> 'ai-extracted' or (
        "events"."confidence" is not null
        and nullif(btrim("events"."raw_input"), '') is not null
        and "events"."provenance" is not null
        and nullif(btrim("events"."provenance"->>'model'), '') is not null
        and nullif(btrim("events"."provenance"->>'prompt_hash'), '') is not null
      ));