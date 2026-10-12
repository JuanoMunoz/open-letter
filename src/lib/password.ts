import { createHash, createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";

function scryptKey(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    _scrypt(password, salt, 32, { N, r, p }, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

function secret(): string {
  const s = process.env.LETTER_COOKIE_SECRET ?? "";
  if (!s) throw new Error("Falta LETTER_COOKIE_SECRET en el entorno.");
  return s;
}

/** Hash scrypt con sal aleatoria: `scrypt$N$r$p$sal$hash`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const N = 16384;
  const r = 8;
  const p = 1;
  const key = await scryptKey(password, salt, N, r, p);
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algo, Ns, rs, ps, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt" || !saltHex || !hashHex) return false;
    const key = await scryptKey(password, Buffer.from(saltHex, "hex"), Number(Ns), Number(rs), Number(ps));
    const expected = Buffer.from(hashHex, "hex");
    if (key.length !== expected.length) return false;
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** Cookie de acceso `exp.sig` ligada al id, válida `maxAgeS`. */
export function signAccessCookie(id: string, exp: number): string {
  const sig = createHmac("sha256", secret()).update(`${id}.${exp}`).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyAccessCookie(id: string, value: string | undefined): boolean {
  if (!value) return false;
  const [expStr, sig] = value.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return false;
  try {
    const expected = createHmac("sha256", secret()).update(`${id}.${exp}`).digest("hex");
    const a = Buffer.from(sig ?? "", "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function accessCookieName(id: string): string {
  return `ol_access_${id}`;
}

/** Hash del manageToken para comparar (reutilizable en panel). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
