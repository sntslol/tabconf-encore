import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const signatures = sqliteTable("signatures", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  emailHash: text("email_hash").notNull().unique(), signedAt: text("signed_at").notNull(),
}, table => [index("signatures_signed_at_idx").on(table.signedAt)]);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expiresAt: integer("expires_at").notNull(),
});
