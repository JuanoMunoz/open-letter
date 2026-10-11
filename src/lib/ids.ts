import { customAlphabet } from "nanoid";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Alfabeto sin caracteres ambiguos (sin 0/O/1/l). */
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const nanoid10 = customAlphabet(ALPHABET, 10);

export function newLetterId(): string {
  return nanoid10();
}

export function newManageToken(): string {
  return randomBytes(32).toString("hex"); // 64 chars
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashIp(ip: string, salt: string): string {
  return sha256Hex(`${salt}:${ip.trim().toLowerCase()}`);
}

/** Comparación en tiempo constante para manage tokens. */
export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
