import type { LetterTemplate, Locale } from "./types";
import amorDeck from "./amor";
import { aniversario } from "./aniversario";
import { cumpleanos } from "./cumpleanos";
import { amistad } from "./amistad";
import { gracias } from "./gracias";
import { perdon } from "./perdon";

export * from "./types";

const decks: Record<LetterTemplate["id"], { es: LetterTemplate }> = {
  amor: amorDeck as { es: LetterTemplate },
  aniversario: { es: aniversario },
  cumpleanos: { es: cumpleanos },
  amistad: { es: amistad },
  gracias: { es: gracias },
  perdon: { es: perdon },
};

export const TEMPLATE_IDS = Object.keys(decks) as Array<LetterTemplate["id"]>;

/** Todas las plantillas en un locale (default `es`). */
export function getTemplates(locale: Locale = "es"): LetterTemplate[] {
  return TEMPLATE_IDS.map((id) => decks[id][locale] ?? decks[id].es);
}

export function getTemplate(id: string, locale: Locale = "es"): LetterTemplate {
  const deck = (decks as Record<string, { es: LetterTemplate }>)[id];
  if (!deck) return decks.amor[locale] ?? decks.amor.es;
  return deck[locale] ?? deck.es;
}

/** Variables CSS del tema para inyectar en la raíz del wizard/visor. */
export function themeVars(t: LetterTemplate["theme"]): React.CSSProperties {
  const script =
    t.font === "kalam"
      ? "var(--font-kalam)"
      : t.font === "dancing"
        ? "var(--font-dancing)"
        : "var(--font-caveat)";
  return {
    "--brand": t.brand,
    "--brand-soft": t.brandSoft,
    "--paper": t.paper,
    "--ink": t.ink,
    "--bg0": t.bgGradient[0],
    "--bg1": t.bgGradient[1],
    "--script-font": script,
  } as React.CSSProperties;
}

/** Clase de fuente script según el tema. */
export function scriptFontClass(font: LetterTemplate["theme"]["font"]): string {
  return font === "kalam" ? "font-kalam" : font === "dancing" ? "font-dancing" : "font-script";
}

/** Familia para canvas 2D (texturas three.js). */
export function scriptFamily(font: LetterTemplate["theme"]["font"]): string {
  return font === "kalam" ? "Kalam" : font === "dancing" ? "Dancing Script" : "Caveat";
}
