CREATE TABLE "letters" (
	"id" varchar(12) PRIMARY KEY NOT NULL,
	"recipient_name" varchar(150) NOT NULL,
	"nickname" varchar(150),
	"special_date" varchar(10),
	"sender_name" varchar(150),
	"main_message" text NOT NULL,
	"love_text" text,
	"story_text" text,
	"dreams_text" text,
	"spotify_track_id" varchar(22),
	"manage_token_hash" varchar(64) NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"letter_id" varchar(12) NOT NULL,
	"ut_key" text NOT NULL,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	"caption" varchar(120),
	"taken_on" varchar(10),
	"place" varchar(120)
);
--> statement-breakpoint
CREATE TABLE "rate_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_letter_id_letters_id_fk" FOREIGN KEY ("letter_id") REFERENCES "public"."letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "letters_expires_at_idx" ON "letters" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "letters_ip_hash_created_idx" ON "letters" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "photos_letter_id_idx" ON "photos" USING btree ("letter_id");--> statement-breakpoint
CREATE INDEX "rate_events_ip_kind_created_idx" ON "rate_events" USING btree ("ip_hash","kind","created_at");