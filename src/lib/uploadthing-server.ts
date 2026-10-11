import { UTApi } from "uploadthing/server";

let instance: UTApi | null = null;

/** Singleton UTApi (solo servidor). Requiere UPLOADTHING_TOKEN. */
export function getUtApi(): UTApi {
  if (!instance) instance = new UTApi();
  return instance;
}
