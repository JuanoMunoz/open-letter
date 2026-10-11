import { NextRequest, NextResponse } from "next/server";
import { getDb, clientIp } from "@/db";
import { letters, photos } from "@/db/schema";
import { createLetterSchema } from "@/lib/schemas";
import { newLetterId, newManageToken, sha256Hex, hashIp } from "@/lib/ids";
import { expiresAtFromNow } from "@/lib/expiry";
import { LIMITS, countRecentEvents, recordEvent } from "@/lib/ratelimit";

/* Las rutas que usan Request son dinámicas por defecto. */

function salt() {
  return process.env.IP_HASH_SALT ?? "dummy-salt";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = createLetterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Honeypot: respuesta 200 falsa sin guardar.
  if (data.website && data.website.length > 0) {
    return NextResponse.json({ id: "honeypot", url: "/", manageToken: "", expiresAt: new Date().toISOString() });
  }

  const ip = clientIp(req.headers);
  const ipHash = hashIp(ip, salt());

  try {
    const count = await countRecentEvents(ipHash, "create", 24);
    if (count >= LIMITS.lettersPerDayPerIp) {
      return NextResponse.json(
        { error: "Límite alcanzado: máximo 5 cartas por día. Intenta mañana." },
        { status: 429 },
      );
    }
  } catch (e) {
    console.warn("[POST /api/cartas] rate-limit omitido (sin DB):", (e as Error)?.message);
  }

  if (data.photos.length > 10) {
    return NextResponse.json({ error: "Máximo 10 fotos" }, { status: 400 });
  }
  for (const p of data.photos) {
    if (!p.key || p.key.length > 512 || p.key.includes("..")) {
      return NextResponse.json({ error: "Clave de foto inválida" }, { status: 400 });
    }
  }

  const id = newLetterId();
  const manageToken = newManageToken();
  const manageTokenHash = sha256Hex(manageToken);
  const now = new Date();
  const expiresAt = expiresAtFromNow(now);

  const norm = (v?: string | null) => (v && v.trim() ? v.trim() : null);

  try {
    const db = getDb();
    const letterRow = {
      id,
      recipientName: data.recipientName.trim(),
      nickname: norm(data.nickname),
      specialDate: data.specialDate ?? null,
      senderName: norm(data.senderName),
      mainMessage: data.mainMessage.trim(),
      loveText: norm(data.loveText),
      storyText: norm(data.storyText),
      dreamsText: norm(data.dreamsText),
      spotifyTrackId: data.spotifyTrackId ?? null,
      template: data.templateId,
      manageTokenHash,
      ipHash,
      expiresAt,
    };
    // El driver HTTP no soporta transacciones interactivas: batch atómico.
    const stmts: unknown[] = [db.insert(letters).values(letterRow)];
    data.photos.forEach((p, i) => {
      stmts.push(
        db.insert(photos).values({
          letterId: id,
          utKey: p.key,
          url: p.url,
          position: i,
          caption: norm(p.caption),
          takenOn: p.takenOn ?? null,
          place: norm(p.place),
        }),
      );
    });
    // batch existe en el driver neon-http; fallback secuencial si no.
    const dbAny = db as unknown as { batch?: (s: unknown[]) => Promise<unknown> };
    if (typeof dbAny.batch === "function") {
      await dbAny.batch(stmts);
    } else {
      for (const s of stmts) await s;
    }
    await recordEvent(ipHash, "create");
  } catch (e) {
    console.error("[POST /api/cartas] error guardando:", e);
    return NextResponse.json(
      { error: "No se pudo guardar la carta. Revisa la base de datos y reintenta." },
      { status: 500 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({
    id,
    url: `${appUrl}/c/${id}`,
    manageToken,
    expiresAt: expiresAt.toISOString(),
  });
}
