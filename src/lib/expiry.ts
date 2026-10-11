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
