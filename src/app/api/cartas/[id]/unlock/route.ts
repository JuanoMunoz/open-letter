import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, clientIp } from "@/db";
import { letters } from "@/db/schema";
import { hashIp } from "@/lib/ids";
import { verifyPassword, signAccessCookie, accessCookieName } from "@/lib/password";
import { LIMITS, countRecentEvents, recordEvent } from "@/lib/ratelimit";

const bodySchema = z.object({ password: z.string().min(1).max(128) });

function salt() {
  return process.env.IP_HASH_SALT ?? "dummy-salt";
}

/** Verifica la palabra secreta y emite cookie de acceso HMAC (24 h). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta la palabra secreta" }, { status: 400 });
  }

  const ipHash = hashIp(clientIp(req.headers), salt());
  try {
    const fails = await countRecentEvents(ipHash, "password", 0.25);
    if (fails >= LIMITS.passwordAttemptsPer15m) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera 15 minutos." },
        { status: 429 },
      );
    }
  } catch (e) {
    console.warn("[unlock] rate-limit omitido:", (e as Error)?.message);
  }

  const db = getDb();
  const rows = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
  const letter = rows[0];
  if (!letter) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!letter.passwordHash) return NextResponse.json({ ok: true });

  const ok = await verifyPassword(parsed.data.password, letter.passwordHash);
  if (!ok) {
    try {
      await recordEvent(ipHash, "password", id);
    } catch { /* noop */ }
    // Respuesta genérica para no filtrar si el id existe (ya 404 arriba) ni pistas.
    return NextResponse.json({ error: "Palabra secreta incorrecta." }, { status: 403 });
  }

  const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
  let value: string;
  try {
    value = signAccessCookie(id, exp);
  } catch {
    return NextResponse.json(
      { error: "Falta configurar LETTER_COOKIE_SECRET en el servidor." },
      { status: 503 },
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(accessCookieName(id), value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/c/${id}`,
    maxAge: 24 * 3600,
  });
  return res;
}
