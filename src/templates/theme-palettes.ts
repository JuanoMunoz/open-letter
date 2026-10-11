/** Paletas cerradas para el paso "Estilo" (nunca CSS libre del usuario). */

export const THEME_COLOR_IDS = ["rosa", "borgona", "salvia", "azul-noche", "ambar"] as const;
export type ThemeColorId = (typeof THEME_COLOR_IDS)[number];

export interface ThemePalette {
  brand: string;
  brandSoft: string;
  paper: string;
  ink: string;
  bgGradient: [string, string];
}

export const THEME_PALETTES: Record<ThemeColorId, ThemePalette> = {
  rosa: {
    brand: "#D6457F",
    brandSoft: "#FBE4EC",
    paper: "#FFF9FB",
    ink: "#3A3A44",
    bgGradient: ["#F4F4F6", "#EDEDF1"],
  },
  borgona: {
    brand: "#8E2A45",
    brandSoft: "#F7E3DE",
    paper: "#FFFBF2",
    ink: "#402E2A",
    bgGradient: ["#F5EFE9", "#EADFD4"],
  },
  salvia: {
    brand: "#5F7A5E",
    brandSoft: "#E4EBDD",
    paper: "#FDFFF8",
    ink: "#2E3A2E",
    bgGradient: ["#EFF2EA", "#E0E6D8"],
  },
  "azul-noche": {
    brand: "#4A5A6A",
    brandSoft: "#E2E7EC",
    paper: "#FAFBFC",
    ink: "#2B3440",
    bgGradient: ["#ECEFF2", "#DDE3E9"],
  },
  ambar: {
    brand: "#E8590C",
    brandSoft: "#FFE8D6",
    paper: "#FFFEF9",
    ink: "#43302B",
    bgGradient: ["#FAF3E8", "#F3E4C8"],
  },
};

export const THEME_FONTS = ["caveat", "kalam", "dancing"] as const;
export const THEME_PARTICLES = ["petalos", "corazones", "estrellas", "confeti", "nieve", "ninguna"] as const;
export const THEME_BACKGROUNDS = ["foto", "liso"] as const;
export const THEME_OPENINGS = ["sobre", "regalo", "raspadita", "ninguna"] as const;
