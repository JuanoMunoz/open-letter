-- Fase B: elimina las columnas de texto legado (ya migradas a sections en 0002).
--> statement-breakpoint
ALTER TABLE "letters" DROP COLUMN IF EXISTS "love_text";
--> statement-breakpoint
ALTER TABLE "letters" DROP COLUMN IF EXISTS "story_text";
--> statement-breakpoint
ALTER TABLE "letters" DROP COLUMN IF EXISTS "dreams_text";
