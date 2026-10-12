import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { letters } from "@/db/schema";

function viewCookieName(id: string) {
  return `ol_v_${id}`;
}

/**
 * Beacon de apertura: cuenta una vez por sesión (cookie de sesión).
 * Lo llama el visor al montar (nunca /preview, nunca la pantalla de acceso).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (req.cookies.get(viewCookieName(id))) {
    return NextResponse.json({ ok: true, counted: false });
  }
  try {
    const db = getDb();
    const rows = await db
      .select({ id: letters.id, expiresAt: letters.expiresAt })
      .from(letters)
      .where(eq(letters.id, id))
      .limit(1);
    const letter = rows[0];
    if (!letter) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (new Date(letter.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Expirada" }, { status: 410 });
    }
    await db
      .update(letters)
      .set({ viewCount: sql`${letters.viewCount} + 1`, lastViewedAt: new Date() })
      .where(eq(letters.id, id));
  } catch (e) {
    console.error("[vista] error:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo contar" }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true, counted: true });
  // Path "/" para que el navegador la envíe también al beacon (/api/...).
  res.cookies.set(viewCookieName(id), "1", { path: "/", sameSite: "lax" });
  return res;
}
