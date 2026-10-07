ALTER TABLE `registrations` ADD `owner_uid` text;--> statement-breakpoint
CREATE INDEX `registration_owner` ON `registrations` (`workspace`,`owner_uid`);