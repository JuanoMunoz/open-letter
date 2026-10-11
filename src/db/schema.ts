import { pgTable, serial, text, varchar, timestamp, integer, uuid, index, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const letters = pgTable(
  "letters",
  {
    id: varchar("id", { length: 12 }).primaryKey(),
    recipientName: varchar("recipient_name", { length: 150 }).notNull(),
    nickname: varchar("nickname", { length: 150 }),
    specialDate: varchar("special_date", { length: 10 }),
    senderName: varchar("sender_name", { length: 150 }),
    mainMessage: text("main_message").notNull(),
    spotifyTrackId: varchar("spotify_track_id", { length: 22 }),
    manageTokenHash: varchar("manage_token_hash", { length: 64 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    template: varchar("template", { length: 24 }).notNull().default("amor"),
    /** Tema visual elegido (colorId, font, particles, background, nightMode). */
    theme: jsonb("theme").notNull().default({}),
    /** Secciones dinámicas: [{ key, kind, title, icon, body, items?, enabled, order }]. */
    sections: jsonb("sections").notNull().default([]),
    /** Hitos de recuerdos: [{ date?, title, body, assetId? }]. */
    timeline: jsonb("timeline").notNull().default([]),
    opening: varchar("opening", { length: 16 }).notNull().default("sobre"),
    passwordHash: text("password_hash"),
    passwordHint: varchar("password_hint", { length: 80 }),
    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    locale: varchar("locale", { length: 5 }).notNull().default("es"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("letters_expires_at_idx").on(t.expiresAt),
    index("letters_ip_hash_created_idx").on(t.ipHash, t.createdAt),
  ],
);

/** Fotos y audios de las cartas (`kind`: image | audio). */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    letterId: varchar("letter_id", { length: 12 })
      .notNull()
      .references(() => letters.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 8 }).notNull().default("image"),
    utKey: text("ut_key").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
    caption: varchar("caption", { length: 120 }),
    takenOn: varchar("taken_on", { length: 10 }),
    place: varchar("place", { length: 120 }),
    durationS: integer("duration_s"),
    mime: varchar("mime", { length: 40 }),
  },
  (t) => [index("assets_letter_id_idx").on(t.letterId)],
);

/** Respuestas del destinatario (se borran con la carta por cascade). */
export const replies = pgTable(
  "replies",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    letterId: varchar("letter_id", { length: 12 })
      .notNull()
      .references(() => letters.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 8 }).notNull(),
    message: varchar("message", { length: 280 }),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("replies_letter_id_idx").on(t.letterId)],
);

export const rateEvents = pgTable(
  "rate_events",
  {
    id: serial("id").primaryKey(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    /** Referencia opcional (ej. `ut_key` subido) para verificar propiedad. */
    ref: varchar("ref", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("rate_events_ip_kind_created_idx").on(t.ipHash, t.kind, t.createdAt)],
);

export type Letter = typeof letters.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Reply = typeof replies.$inferSelect;
/** Alias histórico: `photos` eran los assets de imagen. */
export type Photo = Asset;
