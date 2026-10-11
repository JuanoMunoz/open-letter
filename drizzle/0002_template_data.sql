-- Fase B: secciones dinámicas, tema, timeline, assets, replies (conserva datos).
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "theme" jsonb DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "sections" jsonb DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "timeline" jsonb DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "opening" varchar(16) DEFAULT 'sobre' NOT NULL;
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "password_hash" text;
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "password_hint" varchar(80);
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "last_viewed_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "letters" ADD COLUMN "locale" varchar(5) DEFAULT 'es' NOT NULL;
--> statement-breakpoint
ALTER TABLE "photos" RENAME TO "assets";
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "kind" varchar(8) DEFAULT 'image' NOT NULL;
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "duration_s" integer;
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "mime" varchar(40);
--> statement-breakpoint
ALTER INDEX "photos_letter_id_idx" RENAME TO "assets_letter_id_idx";
--> statement-breakpoint
CREATE TABLE "replies" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "letter_id" varchar(12) NOT NULL, "emoji" varchar(8) NOT NULL, "message" varchar(280), "ip_hash" varchar(64) NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL);
--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_letter_id_letters_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "replies_letter_id_idx" ON "replies" USING btree ("letter_id");
--> statement-breakpoint
ALTER TABLE "rate_events" ADD COLUMN "ref" varchar(256);
--> statement-breakpoint
-- Backfill: love/story/dreams_text (plantilla amor) → sections jsonb.
UPDATE "letters" SET "sections" = (
  SELECT COALESCE(jsonb_agg(s.x ORDER BY s.ord), '[]'::jsonb) FROM (
    SELECT 0 AS ord, jsonb_build_object('key','love','kind','text','title','Lo que me enamora','icon','Heart','body',love_text,'enabled',true,'order',0) AS x WHERE love_text IS NOT NULL
    UNION ALL
    SELECT 1 AS ord, jsonb_build_object('key','story','kind','text','title','Un recuerdo','icon','BookOpen','body',story_text,'enabled',true,'order',1) AS x WHERE story_text IS NOT NULL
    UNION ALL
    SELECT 2 AS ord, jsonb_build_object('key','dreams','kind','text','title','Lo que viene','icon','Sparkles','body',dreams_text,'enabled',true,'order',2) AS x WHERE dreams_text IS NOT NULL
  ) s
) WHERE "sections" = '[]'::jsonb AND (love_text IS NOT NULL OR story_text IS NOT NULL OR dreams_text IS NOT NULL);
