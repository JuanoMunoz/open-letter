/** TTL de cartas: días configurables, por defecto 7. */
export function ttlDays(): number {
  const raw = process.env.LETTER_TTL_DAYS ?? "7";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 30 ? n : 7;
}

export function expiresAtFromNow(now = new Date()): Date {
  return new Date(now.getTime() + ttlDays() * 24 * 60 * 60 * 1000);
}

export function isExpired(expiresAt: Date | string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

/** "9999-12-31" marca la carta de ejemplo que nunca caduca. */
export const NEVER_EXPIRES = "9999-12-31T00:00:00.000Z";

export function isNeverExpiring(expiresAt: Date | string): boolean {
  return new Date(expiresAt).getFullYear() >= 9999;
}
