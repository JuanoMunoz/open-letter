import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb, clientIp } from "@/db";
import { letters, replies } from "@/db/schema";
import { hashIp } from "@/lib/ids";
import { replySchema } from "@/lib/schemas";
import { LIMITS, recordEvent } from "@/lib/ratelimit";
import { verifyManageToken } from "@/lib/panel-auth";

function salt() {
  return process.env.IP_HASH_SALT ?? "dummy-salt";
}

/** El destinatario responde con reacción + mensaje corto. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Respuesta inválida" }, { status: 400 });
  }
  if (parsed.data.website) {
    return NextResponse.json({ ok: true }); // honeypot: 200 falso
  }
  const message = parsed.data.message?.trim() ?? "";
  if (!message && !parsed.data.emoji) {
    return NextResponse.json({ error: "Elige una reacción o escribe algo." }, { status: 400 });
  }

  const db = getDb();
  const rows = await db.select({ id: letters.id, expiresAt: letters.expiresAt }).from(letters).where(eq(letters.id, id)).limit(1);
  const letter = rows[0];
  if (!letter) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (new Date(letter.expiresAt).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Esta carta ya se desvaneció." }, { status: 410 });
  }

  const ipHash = hashIp(clientIp(req.headers), salt());
  try {
    // 5 respuestas por IP por carta.
    const mine = await db.select({ ipHash: replies.ipHash }).from(replies).where(eq(replies.letterId, id));
    if (mine.filter((r) => r.ipHash === ipHash).length >= LIMITS.repliesPerIpPerLetter) {
      return NextResponse.json({ error: "Ya enviaste varias respuestas. ¡Gracias!" }, { status: 429 });
    }
  } catch (e) {
    console.warn("[replies] rate-limit omitido:", (e as Error)?.message);
  }

  try {
    await recordEvent(ipHash, "reply", id);
  } catch { /* noop */ }
  await db.insert(replies).values({
    letterId: id,
    emoji: parsed.data.emoji,
    message: message ? message.slice(0, 280) : null,
    ipHash,
  });
  return NextResponse.json({ ok: true });
}

/** Panel del creador: respuestas + aperturas + caducidad (requiere manageToken). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = await verifyManageToken(id, req.headers.get("x-manage-token") ?? "");
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Falta token" : auth.status === 404 ? "No encontrada" : "Token inválido" },
      { status: auth.status },
    );
  }
  const db = getDb();
  const rows = await db.select().from(letters).where(eq(letters.id, id)).limit(1);
  const letter = rows[0];
  if (!letter) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const all = await db.select().from(replies).where(eq(replies.letterId, id)).orderBy(desc(replies.createdAt));
  return NextResponse.json({
    recipientName: letter.recipientName,
    templateId: letter.template,
    expiresAt: letter.expiresAt,
    viewCount: letter.viewCount,
    lastViewedAt: letter.lastViewedAt,
    replies: all.map((r) => ({
      id: r.id,
      emoji: r.emoji,
      message: r.message,
      createdAt: r.createdAt,
    })),
  });
}
