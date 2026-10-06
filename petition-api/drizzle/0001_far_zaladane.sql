ALTER TABLE `signatures` RENAME COLUMN "email_hash" TO "signer_hash";--> statement-breakpoint
DROP INDEX `signatures_email_hash_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `signatures_signer_hash_unique` ON `signatures` (`signer_hash`);