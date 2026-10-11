import "dotenv/config";
import { runCleanup } from "@/lib/cleanup";

/** Corre la misma limpieza del cron en local: npm run cleanup. Requiere .env con CRON_SECRET/DB. */
async function main() {
  const result = await runCleanup(new Date());
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("[cleanup-local] Error:", e);
  process.exit(1);
});
