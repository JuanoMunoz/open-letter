import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

function buildDb(): NeonHttpDatabase<typeof schema> {
  const url = process.env.DATABASE_URL ?? "postgresql://dummy:dummy@localhost/dummy";
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!dbInstance) dbInstance = buildDb();
  return dbInstance;
}

/** Obtiene la IP real detrás de proxies (Vercel: x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown";
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
