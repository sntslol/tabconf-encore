import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const signatures = sqliteTable("signatures", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  signerHash: text("signer_hash").notNull().unique(), signedAt: text("signed_at").notNull(),
  emailCiphertext: text("email_ciphertext"),
  message: text("message"),
  messageStatus: text("message_status", { enum: ["pending", "approved", "rejected"] }),
  messageReviewedAt: text("message_reviewed_at"),
}, table => [index("signatures_signed_at_idx").on(table.signedAt), index("signatures_message_status_idx").on(table.messageStatus, table.signedAt)]);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expiresAt: integer("expires_at").notNull(),
});
