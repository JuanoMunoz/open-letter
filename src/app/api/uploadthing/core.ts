import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { clientIp } from "@/db";
import { hashIp } from "@/lib/ids";
import { LIMITS, countRecentEvents, recordEvent } from "@/lib/ratelimit";

const f = createUploadthing();

function salt(): string {
  return process.env.IP_HASH_SALT ?? "dummy-salt";
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
        const n = await countRecentEvents(ipHash, "upload", 1);
        if (n >= LIMITS.uploadsPerHourPerIp) {
          throw new UploadThingError("Demasiadas subidas, intenta más tarde");
        }
        await recordEvent(ipHash, "upload");
      } catch (e) {
        if (e instanceof UploadThingError) throw e;
        // Si la DB no está disponible, permite la subida (modo degradado local).
        console.warn("[uploadthing] rate-limit omitido (sin DB):", (e as Error)?.message);
      }
      return { ipHash };
    })
    .onUploadComplete(async ({ file }) => {
      // ufsUrl es el campo vigente; `url` está deprecado.
      const url = (file as { ufsUrl?: string; url?: string }).ufsUrl ?? (file as { url?: string }).url ?? "";
      return { key: file.key, url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
