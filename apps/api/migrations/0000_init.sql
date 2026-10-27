CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`url_hash` text NOT NULL,
	`url` text NOT NULL,
	`domain` text NOT NULL,
	`title` text NOT NULL,
	`content_hash` text NOT NULL,
	`score` integer,
	`level` text NOT NULL,
	`trust_json` text NOT NULL,
	`ai_json` text,
	`fact_checks_json` text DEFAULT '[]' NOT NULL,
	`llm_provider` text,
	`llm_model` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analysis_url_hash_idx` ON `analysis` (`url_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `analysis_domain_idx` ON `analysis` (`domain`);--> statement-breakpoint
CREATE TABLE `api_token` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`label` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_token_token_hash_unique` ON `api_token` (`token_hash`);--> statement-breakpoint
CREATE TABLE `domain_info` (
	`domain` text PRIMARY KEY NOT NULL,
	`registered_at` integer,
	`checked_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `domain_reputation` (
	`domain` text PRIMARY KEY NOT NULL,
	`rating` text NOT NULL,
	`source` text NOT NULL,
	`notes` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`analysis_id` text NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`comment` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`analysis_id`) REFERENCES `analysis`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `usage_counter` (
	`subject` text NOT NULL,
	`day` text NOT NULL,
	`analyses` integer DEFAULT 0 NOT NULL,
	`ai_analyses` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`subject`, `day`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`analysis_id` text NOT NULL,
	`viewed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`analysis_id`) REFERENCES `analysis`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_history_user_analysis_idx` ON `user_history` (`user_id`,`analysis_id`);--> statement-breakpoint
CREATE INDEX `user_history_user_viewed_idx` ON `user_history` (`user_id`,`viewed_at`);--> statement-breakpoint
CREATE TABLE `user_llm_key` (
	`user_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`base_url` text,
	`key_ciphertext` text,
	`key_iv` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
