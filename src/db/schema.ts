import { pgTable, serial, text, varchar, timestamp, integer, uuid, index } from "drizzle-orm/pg-core";
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
    loveText: text("love_text"),
    storyText: text("story_text"),
    dreamsText: text("dreams_text"),
    spotifyTrackId: varchar("spotify_track_id", { length: 22 }),
    manageTokenHash: varchar("manage_token_hash", { length: 64 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("letters_expires_at_idx").on(t.expiresAt),
    index("letters_ip_hash_created_idx").on(t.ipHash, t.createdAt),
  ],
);

export const photos = pgTable(
  "photos",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    letterId: varchar("letter_id", { length: 12 })
      .notNull()
      .references(() => letters.id, { onDelete: "cascade" }),
    utKey: text("ut_key").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
    caption: varchar("caption", { length: 120 }),
    takenOn: varchar("taken_on", { length: 10 }),
    place: varchar("place", { length: 120 }),
  },
  (t) => [index("photos_letter_id_idx").on(t.letterId)],
);

export const rateEvents = pgTable(
  "rate_events",
  {
    id: serial("id").primaryKey(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("rate_events_ip_kind_created_idx").on(t.ipHash, t.kind, t.createdAt)],
);

export type Letter = typeof letters.$inferSelect;
export type Photo = typeof photos.$inferSelect;
