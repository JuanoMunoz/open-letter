import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { clientIp } from "@/db";
import { hashIp } from "@/lib/ids";
import { LIMITS, countRecentEvents, recordEvent } from "@/lib/ratelimit";

const f = createUploadthing();

function salt(): string {
  return process.env.IP_HASH_SALT ?? "dummy-salt";
}

async function checkUploadLimit(ipHash: string, kind: "upload" | "audio"): Promise<void> {
  const n = await countRecentEvents(ipHash, kind, 1);
  if (n >= LIMITS.uploadsPerHourPerIp) {
    throw new UploadThingError("Demasiadas subidas, intenta más tarde");
  }
  await recordEvent(ipHash, kind);
}

function uploadComplete(kind: "upload" | "audio", ipHash: string) {
  return async ({ file }: { file: { key: string; name: string; ufsUrl?: string; url?: string } }) => {
    const url = file.ufsUrl ?? file.url ?? "";
    // Registra la propiedad (ip → ut_key) para validar en POST /api/cartas.
    try {
      await recordEvent(ipHash, kind, file.key);
    } catch (e) {
      console.warn("[uploadthing] no se pudo registrar propiedad:", (e as Error)?.message);
    }
    return { key: file.key, url, name: file.name };
  };
}

export const ourFileRouter = {
  letterImage: f(
    { image: { maxFileSize: "8MB", maxFileCount: 10 } },
    { awaitServerData: false },
  )
    .middleware(async ({ req }) => {
      const ip = clientIp(req.headers);
      const ipHash = hashIp(ip, salt());
      try {
        await checkUploadLimit(ipHash, "upload");
      } catch (e) {
        if (e instanceof UploadThingError) throw e;
        // Si la DB no está disponible, permite la subida (modo degradado local).
        console.warn("[uploadthing] rate-limit omitido (sin DB):", (e as Error)?.message);
      }
      return { ipHash };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return uploadComplete("upload", metadata.ipHash)({ file });
    }),
  letterAudio: f(
    { audio: { maxFileSize: "4MB", maxFileCount: 1 } },
    { awaitServerData: false },
  )
    .middleware(async ({ req }) => {
      const ip = clientIp(req.headers);
      const ipHash = hashIp(ip, salt());
      try {
        await checkUploadLimit(ipHash, "audio");
      } catch (e) {
        if (e instanceof UploadThingError) throw e;
        console.warn("[uploadthing] rate-limit omitido (sin DB):", (e as Error)?.message);
      }
      return { ipHash };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return uploadComplete("audio", metadata.ipHash)({ file });
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
