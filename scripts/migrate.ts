import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

const MIGRATIONS_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS letters (
  id varchar(12) PRIMARY KEY,
  recipient_name varchar(150) NOT NULL,
  nickname varchar(150),
  special_date varchar(10),
  sender_name varchar(150),
  main_message text NOT NULL,
  love_text text,
  story_text text,
  dreams_text text,
  spotify_track_id varchar(22),
  manage_token_hash varchar(64) NOT NULL,
  ip_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS letters_expires_at_idx ON letters (expires_at);
CREATE INDEX IF NOT EXISTS letters_ip_hash_created_idx ON letters (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id varchar(12) NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  kind varchar(8) NOT NULL DEFAULT 'image',
  ut_key text NOT NULL,
  url text NOT NULL,
  position integer NOT NULL,
  caption varchar(120),
  taken_on varchar(10),
  place varchar(120),
  duration_s integer,
  mime varchar(40)
);
CREATE INDEX IF NOT EXISTS assets_letter_id_idx ON assets (letter_id);

CREATE TABLE IF NOT EXISTS rate_events (
  id serial PRIMARY KEY,
  ip_hash varchar(64) NOT NULL,
  kind varchar(16) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_events_ip_kind_created_idx ON rate_events (ip_hash, kind, created_at);

-- Fase A (plantillas): plantilla de cada carta. Default 'amor' para las existentes.
ALTER TABLE letters ADD COLUMN IF NOT EXISTS template varchar(24) NOT NULL DEFAULT 'amor';

-- Fase B: columnas nuevas (idempotentes).
ALTER TABLE letters ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS timeline jsonb NOT NULL DEFAULT '[]';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS opening varchar(16) NOT NULL DEFAULT 'sobre';
ALTER TABLE letters ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS password_hint varchar(80);
ALTER TABLE letters ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS locale varchar(5) NOT NULL DEFAULT 'es';
ALTER TABLE rate_events ADD COLUMN IF NOT EXISTS ref varchar(256);
CREATE TABLE IF NOT EXISTS replies (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), letter_id varchar(12) NOT NULL REFERENCES letters(id) ON DELETE CASCADE, emoji varchar(8) NOT NULL, message varchar(280), ip_hash varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS replies_letter_id_idx ON replies (letter_id);
`;

/** Backfill Fase B: textos legado → sections (solo filas aún vacías). */
const BACKFILL_SQL = `
UPDATE letters SET sections = (
  SELECT COALESCE(jsonb_agg(s.x ORDER BY s.ord), '[]'::jsonb) FROM (
    SELECT 0 AS ord, jsonb_build_object('key','love','kind','text','title','Lo que me enamora','icon','Heart','body',love_text,'enabled',true,'order',0) AS x WHERE love_text IS NOT NULL
    UNION ALL
    SELECT 1 AS ord, jsonb_build_object('key','story','kind','text','title','Un recuerdo','icon','BookOpen','body',story_text,'enabled',true,'order',1) AS x WHERE story_text IS NOT NULL
    UNION ALL
    SELECT 2 AS ord, jsonb_build_object('key','dreams','kind','text','title','Lo que viene','icon','Sparkles','body',dreams_text,'enabled',true,'order',2) AS x WHERE dreams_text IS NOT NULL
  ) s
) WHERE sections = '[]'::jsonb AND (love_text IS NOT NULL OR story_text IS NOT NULL OR dreams_text IS NOT NULL)
`;

/** Fase B: elimina columnas legado (solo si el backfill ya corrió). */
const DROP_LEGACY_SQL = `
ALTER TABLE letters DROP COLUMN IF EXISTS love_text;
ALTER TABLE letters DROP COLUMN IF EXISTS story_text;
ALTER TABLE letters DROP COLUMN IF EXISTS dreams_text;
`;

async function tableExists(db: ReturnType<typeof getDb>, name: string): Promise<boolean> {
  const r = await db.execute(
    sql.raw(`SELECT 1 FROM information_schema.tables WHERE table_name = '${name}' LIMIT 1`),
  );
  const rows = (r as unknown as { rows?: unknown[] }).rows ?? [];
  return rows.length > 0;
}

/** Migración sin drizzle-kit: ejecuta el DDL idempotente contra la URL directa. */
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("[migrate] Falta DATABASE_URL_UNPOOLED o DATABASE_URL en .env");
    process.exit(1);
  }
  console.log("[migrate] Aplicando esquema...");
  const db = getDb();
  // El driver HTTP de Neon no admite múltiples comandos por statement:
  // se ejecuta una sentencia a la vez (todas son IF NOT EXISTS, idempotentes).
  const statements = MIGRATIONS_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  let n = 0;
  for (const stmt of statements) {
    await db.execute(sql.raw(stmt));
    n++;
  }

  // Fase B: photos → assets (solo si photos aún existe y assets no).
  if ((await tableExists(db, "photos")) && !(await tableExists(db, "assets"))) {
    await db.execute(sql.raw(`ALTER TABLE photos RENAME TO assets`));
    await db.execute(sql.raw(`ALTER INDEX IF EXISTS photos_letter_id_idx RENAME TO assets_letter_id_idx`));
    n += 2;
    console.log("[migrate] photos → assets renombrada (datos conservados).");
  }

  // Fase B: si quedaron ambas (assets creada antes del rename), fusiona y elimina photos.
  if ((await tableExists(db, "photos")) && (await tableExists(db, "assets"))) {
    await db.execute(
      sql.raw(
        `INSERT INTO assets (id, letter_id, kind, ut_key, url, position, caption, taken_on, place) SELECT id, letter_id, 'image', ut_key, url, position, caption, taken_on, place FROM photos WHERE id NOT IN (SELECT id FROM assets)`,
      ),
    );
    await db.execute(sql.raw(`DROP TABLE photos`));
    n += 2;
    console.log("[migrate] photos fusionada en assets y eliminada.");
  }

  // Fase B: backfill legado → sections (idempotente por el WHERE).
  try {
    await db.execute(sql.raw(BACKFILL_SQL));
    n++;
  } catch {
    // Si las columnas legado ya no existen (0003 aplicado), no hay nada que migrar.
    console.log("[migrate] backfill omitido (columnas legado ausentes).");
  }

  for (const stmt of DROP_LEGACY_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.execute(sql.raw(stmt));
    n++;
  }
  console.log(`[migrate] OK: ${n} sentencias aplicadas.`);
}

main().catch((e) => {
  console.error("[migrate] Error:", e);
  process.exit(1);
});
