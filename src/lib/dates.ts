import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";

/** "11 de octubre de 2025" */
export function formatLongDate(d: Date | string): string {
  return format(new Date(d), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "18 de octubre, 3:42 p. m." para avisos de caducidad. */
export function formatExpiry(d: Date | string): string {
  return format(new Date(d), "d 'de' MMMM, h:mm aaa", { locale: es });
}

export function daysTogetherText(specialDate: string | Date, now = new Date()): string {
  const diff = differenceInCalendarDays(now, new Date(specialDate));
  if (diff === 0) return "¡Hoy es el día!";
  if (diff > 0) return `${diff} día${diff === 1 ? "" : "s"} juntos`;
  return `Faltan ${Math.abs(diff)} día${Math.abs(diff) === 1 ? "" : "s"}`;
}

export function daysTogetherCount(specialDate: string | Date, now = new Date()): number {
  return differenceInCalendarDays(now, new Date(specialDate));
}
