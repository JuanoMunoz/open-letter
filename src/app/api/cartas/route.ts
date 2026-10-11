import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, clientIp } from "@/db";
import { letters, assets } from "@/db/schema";
import { createLetterSchema } from "@/lib/schemas";
import { newLetterId, newManageToken, sha256Hex, hashIp } from "@/lib/ids";
import { expiresAtFromNow } from "@/lib/expiry";
import { LIMITS, countRecentEvents, recordEvent, isOwnedUpload } from "@/lib/ratelimit";

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

  // Une assets nuevos + fotos legado; el audio cuenta aparte (máx. 1).
  const incoming = [
    ...data.photos.map((p) => ({ ...p, kind: "image" as const })),
    ...data.assets,
  ];
  const images = incoming.filter((a) => a.kind === "image");
  const audios = incoming.filter((a) => a.kind === "audio");
  if (images.length > 10) {
    return NextResponse.json({ error: "Máximo 10 fotos" }, { status: 400 });
  }
  if (audios.length > 1) {
    return NextResponse.json({ error: "Máximo 1 nota de voz" }, { status: 400 });
  }
  for (const a of incoming) {
    if (!a.key || a.key.length > 512 || a.key.includes("..")) {
      return NextResponse.json({ error: "Clave de archivo inválida" }, { status: 400 });
    }
    if (a.kind === "audio" && a.durationS != null && a.durationS > 60) {
      return NextResponse.json({ error: "La nota de voz supera los 60 segundos" }, { status: 400 });
    }
  }

  // Propiedad: cada ut_key debió subirlo esta IP en las últimas 2 h.
  // (Si la DB no responde, se omite el chequeo como el resto de límites.)
  try {
    for (const a of incoming) {
      if (!(await isOwnedUpload(ipHash, a.key))) {
        return NextResponse.json(
          { error: "Un archivo no proviene de tu sesión. Vuelve a subirlo." },
          { status: 403 },
        );
      }
    }
  } catch (e) {
    console.warn("[POST /api/cartas] ownership omitido (sin DB):", (e as Error)?.message);
  }

  // Secciones: contrato nuevo o legado posicional (compat wizard anterior).
  const norm = (v?: string | null) => (v && v.trim() ? v.trim() : null);
  const sectionsInput =
    data.sections.length > 0
      ? data.sections
      : [
          data.loveText ? { key: "love", kind: "text" as const, title: "", icon: "Heart", body: data.loveText, items: [] as string[], enabled: true, order: 0 } : null,
          data.storyText ? { key: "story", kind: "text" as const, title: "", icon: "BookOpen", body: data.storyText, items: [] as string[], enabled: true, order: 1 } : null,
          data.dreamsText ? { key: "dreams", kind: "text" as const, title: "", icon: "Sparkles", body: data.dreamsText, items: [] as string[], enabled: true, order: 2 } : null,
        ].filter((x) => x !== null);
  const sections = sectionsInput
    .filter((s) => s.enabled !== false && ((s.body ?? "").trim() || (s.items ?? []).length > 0))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({ ...s, order: i }));

  const id = newLetterId();
  const manageToken = newManageToken();
  const manageTokenHash = sha256Hex(manageToken);
  const now = new Date();
  const expiresAt = expiresAtFromNow(now);

  try {
    const db = getDb();
    const letterRow = {
      id,
      recipientName: data.recipientName.trim(),
      nickname: norm(data.nickname),
      specialDate: data.specialDate ?? null,
      senderName: norm(data.senderName),
      mainMessage: data.mainMessage.trim(),
      spotifyTrackId: data.spotifyTrackId ?? null,
      template: data.templateId,
      theme: data.theme ?? {},
      sections,
      timeline: data.timeline ?? [],
      opening: data.opening ?? undefined,
      locale: data.locale ?? "es",
      manageTokenHash,
      ipHash,
      expiresAt,
    };
    // El driver HTTP no soporta transacciones interactivas: batch atómico.
    const stmts: unknown[] = [db.insert(letters).values(letterRow)];
    const assetRows = [
      ...images.map((a, i) => ({ ...a, position: i })),
      ...audios.map((a, i) => ({ ...a, position: i })),
    ];
    for (const a of assetRows) {
      stmts.push(
        db.insert(assets).values({
          letterId: id,
          kind: a.kind,
          utKey: a.key,
          url: a.url,
          position: a.position,
          caption: norm(a.caption),
          takenOn: a.takenOn ?? null,
          place: norm(a.place),
          durationS: a.durationS ?? null,
          mime: a.mime || null,
        }),
      );
    }
    // batch existe en el driver neon-http; fallback secuencial si no.
    const dbAny = db as unknown as { batch?: (s: unknown[]) => Promise<unknown> };
    if (typeof dbAny.batch === "function") {
      await dbAny.batch(stmts);
    } else {
      for (const s of stmts) await s;
    }
    // Resuelve assetKey → assetId en el timeline (mismas filas recién creadas).
    const withPhoto = (data.timeline ?? []).filter((m) => m.assetKey);
    if (withPhoto.length > 0) {
      const created = await db.select().from(assets).where(eq(assets.letterId, id));
      const byKey = new Map(created.map((a) => [a.utKey, a.id]));
      const resolved = (data.timeline ?? []).map((m) => ({
        date: m.date ?? null,
        title: m.title,
        body: m.body ?? "",
        assetId: (m.assetKey && byKey.get(m.assetKey)) || null,
      }));
      await db.update(letters).set({ timeline: resolved }).where(eq(letters.id, id));
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
