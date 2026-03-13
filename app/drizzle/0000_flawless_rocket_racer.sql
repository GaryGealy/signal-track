CREATE TABLE `metric_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`metric_type` text NOT NULL,
	`value_numeric` real,
	`value_secondary` real,
	`value_duration` integer,
	`recorded_at` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `metric_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_metric_type` ON `metric_entries` (`metric_type`);--> statement-breakpoint
CREATE INDEX `idx_recorded_at` ON `metric_entries` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_user_metric_recorded` ON `metric_entries` (`user_id`,`metric_type`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);