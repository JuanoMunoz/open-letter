import { eq, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { letters, assets } from "@/db/schema";
import type { LetterView } from "@/components/viewer/types";
import type { SectionItem, TimelineItem, LetterTheme } from "@/templates/types";

function asSections(v: unknown): SectionItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s) => s && typeof s === "object")
    .map((s, i) => {
      const o = s as Record<string, unknown>;
      return {
        key: String(o.key ?? `sec-${i}`),
        kind: String(o.kind ?? "text"),
        title: String(o.title ?? ""),
        icon: String(o.icon ?? "Sparkles"),
        body: String(o.body ?? ""),
        items: Array.isArray(o.items) ? o.items.map(String).slice(0, 20) : [],
        enabled: o.enabled !== false,
        order: typeof o.order === "number" ? o.order : i,
      };
    })
    .filter((s) => s.enabled && (s.body.trim() || s.items.length > 0))
    .sort((a, b) => a.order - b.order);
}

function asTimeline(v: unknown): TimelineItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const o = t as Record<string, unknown>;
      return {
        date: typeof o.date === "string" ? o.date : undefined,
        title: String(o.title ?? "").slice(0, 60),
        body: String(o.body ?? "").slice(0, 200),
        assetId: typeof o.assetId === "string" ? o.assetId : undefined,
      };
    })
    .filter((t) => t.title)
    .slice(0, 8);
}

/** Carga carta + assets desde Neon. `missing` si no existe; `expired` si caducó. */
export async function loadLetter(
  id: string,
): Promise<{ status: "ok"; letter: LetterView } | { status: "missing" } | { status: "expired" }> {
  try {
    const db = getDb();
    const rows = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
    const row = rows[0];
    if (!row) return { status: "missing" };
    if (new Date(row.expiresAt).getTime() <= Date.now()) return { status: "expired" };
    const arows = await db.select().from(assets).where(eq(assets.letterId, id)).orderBy(asc(assets.position));
    return { status: "ok", letter: toView(row, arows) };
  } catch (e) {
    console.error("[loadLetter] error DB:", (e as Error)?.message);
    return { status: "missing" };
  }
}

function toView(
  row: typeof letters.$inferSelect,
  arows: Array<typeof assets.$inferSelect>,
): LetterView {
  const images = arows.filter((a) => (a.kind ?? "image") === "image");
  const audio = arows.find((a) => a.kind === "audio");
  return {
    id: row.id,
    templateId: row.template ?? "amor",
    recipientName: row.recipientName,
    nickname: row.nickname,
    specialDate: row.specialDate,
    senderName: row.senderName,
    mainMessage: row.mainMessage,
    sections: asSections(row.sections),
    timeline: asTimeline(row.timeline),
    theme: (row.theme ?? {}) as LetterTheme,
    opening: row.opening ?? "sobre",
    spotifyTrackId: row.spotifyTrackId,
    expiresAt: new Date(row.expiresAt).toISOString(),
    photos: images.map((p) => ({
      url: p.url,
      caption: p.caption,
      takenOn: p.takenOn,
      place: p.place,
    })),
    audio: audio
      ? { url: audio.url, durationS: audio.durationS, mime: audio.mime }
      : null,
  };
}
