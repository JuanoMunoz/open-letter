import { inArray, lte, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { letters, assets, rateEvents } from "@/db/schema";
import { getUtApi } from "./uploadthing-server";
import { ttlDays } from "./expiry";

export interface CleanupResult {
  lettersDeleted: number;
  filesDeleted: number;
  orphansDeleted: number;
  rateEventsDeleted: number;
  durationMs: number;
}

const BATCH = 50;
const TIME_BUDGET_MS = 50_000;

/**
 * Limpieza completa: cartas caducadas (con sus archivos) + huérfanos
 * de UploadThing + rate_events viejos. Misma lógica para el cron
 * de Vercel y para `npm run cleanup` en local.
 */
export async function runCleanup(now = new Date()): Promise<CleanupResult> {
  const started = Date.now();
  const db = getDb();
  let lettersDeleted = 0;
  let filesDeleted = 0;
  let orphansDeleted = 0;

  // 1. Cartas caducadas en lotes de 50.
  for (;;) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const expired = await db
      .select({ id: letters.id })
      .from(letters)
      .where(lte(letters.expiresAt, now))
      .limit(BATCH);
    const ids = expired.map((r) => r.id);
    if (ids.length === 0) break;

    const assetRows = ids.length
      ? await db.select({ utKey: assets.utKey }).from(assets).where(inArray(assets.letterId, ids))
      : [];
    const keys = assetRows.map((p) => p.utKey).filter(Boolean);

    // Borra archivos primero; si falla, no borra la fila (reintento próximo cron).
    if (keys.length > 0) {
      try {
        const utapi = getUtApi();
        for (let i = 0; i < keys.length; i += 100) {
          const chunk = keys.slice(i, i + 100);
          const res = await utapi.deleteFiles(chunk);
          filesDeleted += res?.deletedCount ?? chunk.length;
        }
      } catch (e) {
        console.error("[cleanup] deleteFiles falló, conservo filas para reintentar:", e);
        break;
      }
    }
    await db.delete(letters).where(inArray(letters.id, ids));
    lettersDeleted += ids.length;
    if (ids.length < BATCH) break;
  }

  // 2. Barrido de huérfanos: archivos más viejos que TTL+1 días sin carta asociada.
  try {
    const utapi = getUtApi();
    const cutoff = new Date(now.getTime() - (ttlDays() + 1) * 24 * 3600_1000);
    // listFiles pagina; revisamos hasta 2000 archivos.
    let offset = 0;
    const staleKeys: string[] = [];
    for (let page = 0; page < 4; page++) {
      const listed = await utapi.listFiles({ limit: 500, offset } as never);
      const files = (listed as unknown as { files?: Array<{ key: string; uploadedAt?: number | string }> }).files
        ?? (listed as unknown as Array<{ key: string; uploadedAt?: number | string }>);
      const arr = Array.isArray(files) ? files : [];
      if (arr.length === 0) break;
      for (const f of arr) {
        const uploaded = f.uploadedAt ? new Date(f.uploadedAt) : null;
        if (uploaded && uploaded < cutoff && f.key) staleKeys.push(f.key);
      }
      if (arr.length < 500) break;
      offset += 500;
      if (Date.now() - started > TIME_BUDGET_MS) break;
    }
    if (staleKeys.length > 0) {
      // Solo borra los que NO estén referenciados en assets (imagen o audio).
      const referenced = staleKeys.length
        ? await db.select({ utKey: assets.utKey }).from(assets).where(inArray(assets.utKey, staleKeys.slice(0, 500)))
        : [];
      const refSet = new Set(referenced.map((r) => r.utKey));
      const safe = staleKeys.filter((k) => !refSet.has(k));
      for (let i = 0; i < safe.length; i += 100) {
        const res = await getUtApi().deleteFiles(safe.slice(i, i + 100));
        orphansDeleted += res?.deletedCount ?? 0;
      }
    }
  } catch (e) {
    // listFiles puede no estar disponible según plan; no bloquea la limpieza principal.
    console.warn("[cleanup] barrido de huérfanos omitido:", (e as Error)?.message ?? e);
  }

  // 3. rate_events de más de 2 días.
  let rateEventsDeleted = 0;
  try {
    const cutoff = new Date(now.getTime() - 2 * 24 * 3600_000);
    const res = await db.delete(rateEvents).where(lt(rateEvents.createdAt, cutoff)).returning({ id: rateEvents.id });
    rateEventsDeleted = res.length;
  } catch (e) {
    console.warn("[cleanup] limpieza rate_events omitida:", (e as Error)?.message ?? e);
  }

  const result: CleanupResult = {
    lettersDeleted,
    filesDeleted,
    orphansDeleted,
    rateEventsDeleted,
    durationMs: Date.now() - started,
  };
  console.log("[cleanup] resultado:", JSON.stringify(result));
  return result;
}
