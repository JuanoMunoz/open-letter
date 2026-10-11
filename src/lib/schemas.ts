import { z } from "zod";

const text1200 = z.string().max(1200, "Máximo 1200 caracteres");
const optText1200 = text1200.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v));

export const photoInputSchema = z.object({
  key: z.string().min(1).max(512),
  url: z.string().url().max(2048),
  caption: z.string().max(120).optional().default(""),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  place: z.string().max(120).optional().default(""),
});

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
  /** Honeypot anti-bots: debe venir vacío. */
  website: z.string().max(0).optional().default(""),
});

export type CreateLetterInput = z.infer<typeof createLetterSchema>;
