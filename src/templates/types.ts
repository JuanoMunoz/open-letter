/** Tipos del sistema de plantillas (copy deck). Locale `es` por ahora;
 *  la estructura está indexada por locale para sumar `en`/`pt` después. */

export type Locale = "es";
export type ScriptFont = "caveat" | "kalam" | "dancing";
export type ParticleKind =
  | "petalos"
  | "corazones"
  | "estrellas"
  | "confeti"
  | "nieve"
  | "ninguna";
export type OpeningKind = "sobre" | "regalo" | "raspadita" | "ninguna";

export interface TemplateTheme {
  brand: string;
  brandSoft: string;
  paper: string;
  ink: string;
  bgGradient: [string, string];
  font: ScriptFont;
}

export interface WizardCopy {
  step1Title: [string, string, string];
  step2Title: [string, string, string];
  step3Title: [string, string, string];
  step4Title: [string, string, string];
  recipientLabel: string;
  recipientPlaceholder: string;
  optionalTitle: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  dateLabel: string;
  senderLabel: string;
  senderPlaceholder: string;
  back: string;
  next: string;
  create: string;
  creating: string;
}

export interface SectionDef {
  key: string;
  label: string;
  placeholder: string;
  /** Nombre de icono lucide (se resuelve en un registro central). */
  icon: string;
  viewerTitle: string;
  suggestions: string[];
  defaultEnabled: boolean;
  required?: boolean;
  maxLength: number;
}

/** Sección guardada en `letters.sections` (jsonb). */
export interface SectionItem {
  key: string;
  /** text | reasons | openwhen | promises | free */
  kind: string;
  title: string;
  icon: string;
  body: string;
  /** Ítems para listas (razones, promesas, ábrela-cuándo). */
  items?: string[];
  /** Pares condición→texto para "Ábrela cuando…". */
  pairs?: Array<{ when: string; text: string }>;
  enabled: boolean;
  order: number;
}

/** Hito de `letters.timeline` (jsonb). */
export interface TimelineItem {
  date?: string;
  title: string;
  body: string;
  assetId?: string;
}

/** Tema guardado en `letters.theme` (jsonb, solo listas cerradas). */
export interface LetterTheme {
  colorId?: string;
  font?: string;
  particles?: string;
  background?: string;
  nightMode?: boolean;
}

export interface CoverCopy {
  greeting: string;
  closing: string;
}

export interface LetterTemplate {
  id: "amor" | "aniversario" | "cumpleanos" | "amistad" | "gracias" | "perdon";
  name: string;
  /** Nombre de icono lucide para el selector (sin emojis). */
  icon: string;
  tagline: string;
  theme: TemplateTheme;
  particles: ParticleKind;
  opening: OpeningKind;
  wizard: WizardCopy;
  cover: CoverCopy;
  sections: SectionDef[];
  closingLine: string;
  /** Textos de la apertura (ritual). */
  openingInvite: string;
  tapCounter: (taps: number, needed: number) => string;
  /** Fecha / canción / final del visor. */
  dateSectionTitle: string;
  daysTogether: (n: number) => string;
  daysMissing: (n: number) => string;
  todayLine: string;
  songTitle: string;
  footerSuffix: string;
  expiredTitle: string;
  expiredBody: string;
  expiredCta: string;
  missingTitle: string;
  missingBody: string;
}

export type TemplateDeck = Record<Locale, LetterTemplate>;
