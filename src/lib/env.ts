import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida (Neon pooled)"),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  UPLOADTHING_TOKEN: z.string().min(1, "UPLOADTHING_TOKEN es requerido"),
  CRON_SECRET: z.string().min(8, "CRON_SECRET es requerido (openssl rand -hex 32)"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  LETTER_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  IP_HASH_SALT: z.string().min(1, "IP_HASH_SALT es requerido (openssl rand -hex 16)"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;
let warnedMissing = false;

/** Validación perezosa: no revienta `next build` sin .env, pero falla claro en runtime. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    // Durante el build permitimos continuar con valores dummy para
    // que `npm run build` y el typecheck pasen sin credenciales reales.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      if (!warnedMissing) {
        warnedMissing = true;
        console.warn(`[env] faltan variables en build, usando dummy: ${missing}`);
      }
      cached = {
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://dummy:dummy@localhost/dummy",
        UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN ?? "dummy",
        CRON_SECRET: process.env.CRON_SECRET ?? "dummy-build-secret",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        LETTER_TTL_DAYS: Number(process.env.LETTER_TTL_DAYS ?? 7),
        IP_HASH_SALT: process.env.IP_HASH_SALT ?? "dummy-salt",
      };
      return cached;
    }
    throw new Error(
      `Variables de entorno inválidas/faltantes. Copia .env.example a .env y completa: ${missing}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** ¿Hay configuración real (no dummy)? */
export function hasRealEnv(): boolean {
  return Boolean(
    process.env.DATABASE_URL && process.env.UPLOADTHING_TOKEN && process.env.IP_HASH_SALT,
  );
}
