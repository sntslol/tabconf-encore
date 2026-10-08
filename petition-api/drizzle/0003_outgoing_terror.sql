ALTER TABLE `signatures` ADD `message` text;--> statement-breakpoint
ALTER TABLE `signatures` ADD `message_status` text;--> statement-breakpoint
ALTER TABLE `signatures` ADD `message_reviewed_at` text;--> statement-breakpoint
CREATE INDEX `signatures_message_status_idx` ON `signatures` (`message_status`,`signed_at`);