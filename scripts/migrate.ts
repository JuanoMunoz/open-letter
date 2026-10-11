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

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id varchar(12) NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  ut_key text NOT NULL,
  url text NOT NULL,
  position integer NOT NULL,
  caption varchar(120),
  taken_on varchar(10),
  place varchar(120)
);
CREATE INDEX IF NOT EXISTS photos_letter_id_idx ON photos (letter_id);

CREATE TABLE IF NOT EXISTS rate_events (
  id serial PRIMARY KEY,
  ip_hash varchar(64) NOT NULL,
  kind varchar(16) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_events_ip_kind_created_idx ON rate_events (ip_hash, kind, created_at);
`;

/** Migración sin drizzle-kit: ejecuta el DDL idempotente contra la URL directa. */
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("[migrate] Falta DATABASE_URL_UNPOOLED o DATABASE_URL en .env");
    process.exit(1);
  }
  console.log("[migrate] Aplicando esquema...");
  const db = getDb();
  await db.execute(sql.raw(MIGRATIONS_SQL));
  console.log("[migrate] OK: letters, photos, rate_events listas.");
}

main().catch((e) => {
  console.error("[migrate] Error:", e);
  process.exit(1);
});
