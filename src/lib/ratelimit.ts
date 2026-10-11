import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateEvents } from "@/db/schema";

/** Ventana deslizante: ¿cuántos eventos `kind` hizo este ipHash en las últimas `hours`? */
export async function countRecentEvents(
  ipHash: string,
  kind: "upload" | "create",
  hours: number,
): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - hours * 3600_000);
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rateEvents)
    .where(and(eq(rateEvents.ipHash, ipHash), eq(rateEvents.kind, kind), gte(rateEvents.createdAt, since)));
  return rows[0]?.n ?? 0;
}

export async function recordEvent(ipHash: string, kind: "upload" | "create"): Promise<void> {
  const db = getDb();
  await db.insert(rateEvents).values({ ipHash, kind });
}

export const LIMITS = {
  uploadsPerHourPerIp: 40,
  lettersPerDayPerIp: 5,
} as const;
