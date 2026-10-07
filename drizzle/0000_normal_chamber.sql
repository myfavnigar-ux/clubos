CREATE TABLE `events` (
	`workspace` text NOT NULL,
	`id` text NOT NULL,
	`fest_id` text NOT NULL,
	`data` text NOT NULL,
	`capacity` integer NOT NULL,
	`deadline` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	PRIMARY KEY(`workspace`, `id`)
);
--> statement-breakpoint
CREATE TABLE `festivals` (
	`workspace` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`workspace`, `id`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`institution` text NOT NULL,
	`status` text NOT NULL,
	`own` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_identity` ON `registrations` (`workspace`,`event_id`,`email`);--> statement-breakpoint
CREATE INDEX `registration_workspace_event` ON `registrations` (`workspace`,`event_id`,`status`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL
);
