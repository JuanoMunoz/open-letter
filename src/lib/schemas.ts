import { z } from "zod";
import {
  THEME_COLOR_IDS,
  THEME_FONTS,
  THEME_PARTICLES,
  THEME_BACKGROUNDS,
  THEME_OPENINGS,
} from "@/templates/theme-palettes";

const text1200 = z.string().max(1200, "Máximo 1200 caracteres");
const optText1200 = text1200.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));

export const assetInputSchema = z.object({
  kind: z.enum(["image", "audio"]).optional().default("image"),
  key: z.string().min(1).max(512),
  url: z.string().url().max(2048),
  caption: z.string().max(120).optional().default(""),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  place: z.string().max(120).optional().default(""),
  durationS: z.number().int().min(1).max(120).optional().nullable(),
  mime: z.string().max(40).optional().default(""),
});

/** Compat: las fotos siguen validándose igual. */
export const photoInputSchema = assetInputSchema;

export const sectionItemSchema = z.object({
  key: z.string().min(1).max(64),
  kind: z.enum(["text", "reasons", "openwhen", "promises", "free"]).optional().default("text"),
  title: z.string().max(120).optional().default(""),
  icon: z.string().max(32).optional().default("Sparkles"),
  body: z.string().max(1200).optional().default(""),
  items: z.array(z.string().max(140)).max(20).optional().default([]),
  /** Pares condición→texto para "Ábrela cuando…" (máx. 5). */
  pairs: z
    .array(z.object({ when: z.string().max(80), text: z.string().max(280) }))
    .max(5)
    .optional()
    .default([]),
  enabled: z.boolean().optional().default(true),
  order: z.number().int().min(0).max(30).optional().default(0),
});

export const timelineItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  title: z.string().trim().min(1).max(60),
  body: z.string().trim().max(200).optional().default(""),
  assetId: z.string().uuid().optional().nullable(),
  /** ut_key temporal del wizard (se resuelve a assetId al crear). */
  assetKey: z.string().max(512).optional().nullable(),
});

export const letterThemeSchema = z.object({
  colorId: z.enum(THEME_COLOR_IDS).optional(),
  font: z.enum(THEME_FONTS).optional(),
  particles: z.enum(THEME_PARTICLES).optional(),
  background: z.enum(THEME_BACKGROUNDS).optional(),
  nightMode: z.boolean().optional(),
});

export const openingSchema = z.enum(THEME_OPENINGS);

export const templateIdSchema = z.enum([
  "amor",
  "aniversario",
  "cumpleanos",
  "amistad",
  "gracias",
  "perdon",
]);

export const createLetterSchema = z.object({
  templateId: templateIdSchema.optional().default("amor"),
  recipientName: z.string().trim().min(1, "El nombre es obligatorio").max(150),
  nickname: z.string().trim().max(150).optional().default(""),
  specialDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  senderName: z.string().trim().max(150).optional().default(""),
  mainMessage: z.string().trim().min(1, "El mensaje principal es obligatorio").max(1200),
  loveText: optText1200,
  storyText: optText1200,
  dreamsText: optText1200,
  spotifyTrackId: z
    .string()
    .regex(/^[A-Za-z0-9]{22}$/, "ID de Spotify inválido")
    .optional()
    .nullable(),
  photos: z.array(photoInputSchema).max(10).default([]),
  /** Nuevo contrato (Fase C): assets con kind + secciones dinámicas. */
  assets: z.array(assetInputSchema).max(11).optional().default([]),
  sections: z.array(sectionItemSchema).max(8).optional().default([]),
  timeline: z.array(timelineItemSchema).max(8).optional().default([]),
  theme: letterThemeSchema.optional().default({}),
  opening: openingSchema.optional(),
  locale: z.enum(["es"]).optional().default("es"),
  /** Honeypot anti-bots: debe venir vacío. */
  website: z.string().max(0).optional().default(""),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;
