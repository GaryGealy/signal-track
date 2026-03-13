-- Fix: replace placeholder schema with correct schema
-- Drops tables created by the placeholder migration and recreates them correctly.

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS metric_entries;
DROP TABLE IF EXISTS users;

CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

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
CREATE INDEX `idx_user_id` ON `metric_entries` (`user_id`);
CREATE INDEX `idx_metric_type` ON `metric_entries` (`metric_type`);
CREATE INDEX `idx_recorded_at` ON `metric_entries` (`recorded_at`);
CREATE INDEX `idx_user_metric_recorded` ON `metric_entries` (`user_id`,`metric_type`,`recorded_at`);
