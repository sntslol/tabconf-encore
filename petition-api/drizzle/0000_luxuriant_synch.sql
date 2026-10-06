CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email_hash` text NOT NULL,
	`signed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `signatures_email_hash_unique` ON `signatures` (`email_hash`);--> statement-breakpoint
CREATE INDEX `signatures_signed_at_idx` ON `signatures` (`signed_at`);