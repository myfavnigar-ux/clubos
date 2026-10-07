CREATE TABLE `directory` (
	`uid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`searchable` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`subscription` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`team_id` text NOT NULL,
	`uid` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`team_id`, `uid`)
);
--> statement-breakpoint
CREATE INDEX `member_inbox` ON `team_members` (`uid`,`status`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`leader` text NOT NULL,
	`name` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `team_id` text;--> statement-breakpoint
ALTER TABLE `registrations` ADD `team_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `members` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `trx_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `payment` text DEFAULT '{}' NOT NULL;