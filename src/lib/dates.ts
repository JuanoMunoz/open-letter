import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Los `<input type="date">` y la API usan "YYYY-MM-DD" sin hora.
 * `new Date("2025-10-11")` lo interpreta como medianoche UTC, que al oeste de
 * Greenwich (ej. Bogotá UTC-5) cae en el día anterior. Por eso se interpreta
 * como mediodía LOCAL: el día mostrado y el conteo siempre son correctos.
 */
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return new Date(value);
}

/** "11 de octubre de 2025" */
export function formatLongDate(d: Date | string): string {
  return format(parseDateOnly(d), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "18 de octubre, 3:42 p. m." para avisos de caducidad. */
export function formatExpiry(d: Date | string): string {
  return format(new Date(d), "d 'de' MMMM, h:mm aaa", { locale: es });
}

export function daysTogetherText(specialDate: string | Date, now = new Date()): string {
  const diff = differenceInCalendarDays(now, parseDateOnly(specialDate));
  if (diff === 0) return "¡Hoy es el día!";
  if (diff > 0) return `${diff} día${diff === 1 ? "" : "s"} juntos`;
  return `Faltan ${Math.abs(diff)} día${Math.abs(diff) === 1 ? "" : "s"}`;
}

export function daysTogetherCount(specialDate: string | Date, now = new Date()): number {
  return differenceInCalendarDays(now, parseDateOnly(specialDate));
}
