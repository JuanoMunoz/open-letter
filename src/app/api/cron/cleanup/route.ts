import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/lib/cleanup";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const result = await runCleanup(new Date());
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/cleanup] error:", e);
    return NextResponse.json({ error: "Falló la limpieza" }, { status: 500 });
  }
}
