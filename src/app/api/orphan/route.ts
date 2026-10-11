import { NextRequest, NextResponse } from "next/server";
import { getUtApi } from "@/lib/uploadthing-server";

/** Borra un archivo huérfano (foto eliminada antes de crear la carta). Sin auth: la key esunguessable. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const key = (body as { key?: string })?.key;
  if (!key || typeof key !== "string" || key.length > 512) {
    return NextResponse.json({ error: "key inválida" }, { status: 400 });
  }
  try {
    await getUtApi().deleteFiles([key]);
  } catch (e) {
    console.warn("[orphan] deleteFiles falló (se limpiará en el cron):", (e as Error)?.message);
  }
  return NextResponse.json({ ok: true });
}
