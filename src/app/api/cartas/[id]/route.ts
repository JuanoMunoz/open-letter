import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { letters, photos } from "@/db/schema";
import { sha256Hex, safeEqualHex } from "@/lib/ids";
import { getUtApi } from "@/lib/uploadthing-server";

/* Las rutas que usan Request son dinámicas por defecto. */

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = req.headers.get("x-manage-token") ?? "";
  if (!token) return NextResponse.json({ error: "Falta token de gestión" }, { status: 401 });

  const db = getDb();
  const rows = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
  const letter = rows[0];
  if (!letter) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const ok = safeEqualHex(sha256Hex(token), letter.manageTokenHash);
  if (!ok) return NextResponse.json({ error: "Token inválido" }, { status: 403 });

  const photoRows = await db.select().from(photos).where(eq(photos.letterId, id));
  const keys = photoRows.map((p) => p.utKey).filter(Boolean);
  if (keys.length > 0) {
    try {
      await getUtApi().deleteFiles(keys);
    } catch (e) {
      console.error("[DELETE] deleteFiles falló:", e);
      return NextResponse.json(
        { error: "No se pudieron borrar las imágenes. Intenta de nuevo." },
        { status: 502 },
      );
    }
  }
  await db.delete(letters).where(eq(letters.id, id));
  return new NextResponse(null, { status: 204 });
}
