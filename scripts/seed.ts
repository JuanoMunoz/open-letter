import { getDb } from "@/db";
import { letters, photos } from "@/db/schema";
import { ejemploLetter } from "@/lib/letter-data";
import { sha256Hex } from "@/lib/ids";
import { eq, sql } from "drizzle-orm";

/**
 * Carta de ejemplo en /c/ejemplo (no caduca: expires_at 9999-12-31).
 * Uso: npm run db:seed (requiere DATABASE_URL).
 * La foto de Unsplash se referencia por URL; para producción súbela a
 * UploadThing y actualiza la fila `photos` con su ut_key.
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[seed] Falta DATABASE_URL en .env");
    process.exit(1);
  }
  const db = getDb();
  const ex = ejemploLetter();

  await db.delete(photos).where(eq(photos.letterId, "ejemplo"));
  await db.delete(letters).where(eq(letters.id, "ejemplo"));

  await db.insert(letters).values({
    id: "ejemplo",
    recipientName: ex.recipientName,
    nickname: ex.nickname || null,
    specialDate: ex.specialDate,
    senderName: ex.senderName || null,
    mainMessage: ex.mainMessage,
    loveText: ex.loveText || null,
    storyText: ex.storyText || null,
    dreamsText: ex.dreamsText || null,
    spotifyTrackId: ex.spotifyTrackId || null,
    manageTokenHash: sha256Hex("ejemplo-manage-token-cambiar"),
    ipHash: sha256Hex("seed"),
    expiresAt: new Date("9999-12-31T00:00:00.000Z"),
  });
  await db.insert(photos).values(
    ex.photos.map((p, i) => ({
      letterId: "ejemplo",
      utKey: `seed/ejemplo-${i}`,
      url: p.url,
      position: i,
      caption: p.caption,
      takenOn: p.takenOn,
      place: p.place,
    })),
  );
  const count = await db.execute(sql`select count(*)::int as n from letters`);
  console.log("[seed] OK: /c/ejemplo creada (no caduca).", JSON.stringify(count));
}

main().catch((e) => {
  console.error("[seed] Error:", e);
  process.exit(1);
});
