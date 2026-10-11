import "dotenv/config";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.join(__dirname, "..", "src", "app", "icon.svg");
const OUT_DIR = path.join(__dirname, "..", "src", "app");

/** Genera favicon.ico (16+32) y apple-icon.png (180) desde icon.svg. */
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const png16 = await sharp(SRC).resize(16, 16).png().toBuffer();
  const png32 = await sharp(SRC).resize(32, 32).png().toBuffer();
  const ico = await pngToIco([png16, png32]);
  await writeFile(path.join(OUT_DIR, "favicon.ico"), ico);
  await sharp(SRC).resize(180, 180).png().toFile(path.join(OUT_DIR, "apple-icon.png"));
  console.log("[icons] OK: favicon.ico + apple-icon.png generados desde icon.svg");
}

main().catch((e) => {
  console.error("[icons] Error:", e);
  process.exit(1);
});
