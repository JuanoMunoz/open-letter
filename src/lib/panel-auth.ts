import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { letters } from "@/db/schema";
import { sha256Hex, safeEqualHex } from "@/lib/ids";

/** Verifica el manageToken del creador (comparación en tiempo constante). */
export async function verifyManageToken(
  id: string,
  token: string,
): Promise<{ ok: true; letterId: string } | { ok: false; status: number }> {
  if (!token) return { ok: false, status: 401 };
  const db = getDb();
  const rows = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
  const letter = rows[0];
  if (!letter) return { ok: false, status: 404 };
  if (!safeEqualHex(sha256Hex(token), letter.manageTokenHash)) return { ok: false, status: 403 };
  return { ok: true, letterId: id };
}
