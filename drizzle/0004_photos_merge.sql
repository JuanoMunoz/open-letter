-- Fase B (corrección): si el rename no se aplicó porque assets ya existía,
-- fusiona las fotos huérfanas y elimina la tabla vieja.
--> statement-breakpoint
INSERT INTO assets (id, letter_id, kind, ut_key, url, position, caption, taken_on, place) SELECT id, letter_id, 'image', ut_key, url, position, caption, taken_on, place FROM photos WHERE id NOT IN (SELECT id FROM assets);
--> statement-breakpoint
DROP TABLE IF EXISTS photos;
