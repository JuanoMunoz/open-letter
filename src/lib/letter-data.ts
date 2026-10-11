import { eq, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { letters, photos } from "@/db/schema";
import type { LetterView } from "@/components/viewer/types";

/** Carga carta + fotos desde Neon. `missing` si no existe; `expired` si caducó. */
export async function loadLetter(
  id: string,
): Promise<{ status: "ok"; letter: LetterView } | { status: "missing" } | { status: "expired" }> {
  try {
    const db = getDb();
    const rows = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
    const row = rows[0];
    if (!row) return { status: "missing" };
    if (new Date(row.expiresAt).getTime() <= Date.now()) return { status: "expired" };
    const prows = await db.select().from(photos).where(eq(photos.letterId, id)).orderBy(asc(photos.position));
    return { status: "ok", letter: toView(row, prows) };
  } catch (e) {
    console.error("[loadLetter] error DB:", (e as Error)?.message);
    return { status: "missing" };
  }
}

function toView(
  row: typeof letters.$inferSelect,
  prows: Array<typeof photos.$inferSelect>,
): LetterView {
  return {
    id: row.id,
    templateId: row.template ?? "amor",
    recipientName: row.recipientName,
    nickname: row.nickname,
    specialDate: row.specialDate,
    senderName: row.senderName,
    mainMessage: row.mainMessage,
    loveText: row.loveText,
    storyText: row.storyText,
    dreamsText: row.dreamsText,
    spotifyTrackId: row.spotifyTrackId,
    expiresAt: new Date(row.expiresAt).toISOString(),
    photos: prows.map((p) => ({
      url: p.url,
      caption: p.caption,
      takenOn: p.takenOn,
      place: p.place,
    })),
  };
}
