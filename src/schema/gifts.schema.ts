import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const gifts = pgTable('gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  occasion: text('occasion').notNull(),
  notes: text('notes'),
  liked: boolean('liked').notNull().default(false),
  givenAt: timestamp('given_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type GiftRow = typeof gifts.$inferSelect;
export type NewGiftRow = typeof gifts.$inferInsert;
