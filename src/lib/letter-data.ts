import { eq, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { letters, photos } from "@/db/schema";
import type { LetterView } from "@/components/viewer/types";

export const EJEMPLO_ID = "ejemplo";

export function ejemploLetter(): LetterView {
  return {
    id: "ejemplo",
    recipientName: "Daniela",
    nickname: "",
    specialDate: "2025-10-11",
    senderName: "Juancoquito",
    mainMessage:
      "Daniela, no hay día en que no le agradezca a la vida poder pasarla a tu lado. Te amo y me encanta poder decírtelo todos los días.",
    loveText:
      "A tu lado crecí y aprendí a amar con menos miedo. Amo la relación que hemos construido y odio que el mundo solo lleva 1 año sabiendo que la amo.",
    storyText:
      "Hoy recuerdo la primera vez que desperté contigo en una cama. Ese día me di cuenta de que quería despertarme así por el resto de mi vida.",
    dreamsText:
      "Definitivamente quiero que me sigas enseñando de pinturas que no entiendo, y de amores que se me salen de las manos bajo el cielo contaminado de Bogotá. Quiero hacerlo todo contigo, porque ahí me siento realmente yo.",
    spotifyTrackId: "59oiL6uvsww8qQl3BYfdfC",
    expiresAt: "9999-12-31T00:00:00.000Z",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=900&q=80&auto=format&fit=crop",
        caption: "Mi amor de vida en mi ciudad.",
        takenOn: "2025-10-11",
        place: "Bogotá",
      },
    ],
  };
}

/** Carga carta + fotos. Devuelve null si no existe; `expired` si caducó. */
export async function loadLetter(
  id: string,
): Promise<{ status: "ok"; letter: LetterView } | { status: "missing" } | { status: "expired" }> {
  if (id === EJEMPLO_ID) {
    // Intenta DB primero (seed real); si no hay, usa datos en memoria.
    try {
      if (process.env.DATABASE_URL) {
        const db = getDb();
        const rows = await db.select().from(letters).where(eq(letters.id, EJEMPLO_ID)).limit(1);
        if (rows[0]) {
          const prows = await db.select().from(photos).where(eq(photos.letterId, EJEMPLO_ID)).orderBy(asc(photos.position));
          return { status: "ok", letter: toView(rows[0], prows) };
        }
      }
    } catch {
      // sin DB: fallback en memoria
    }
    return { status: "ok", letter: ejemploLetter() };
  }

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
