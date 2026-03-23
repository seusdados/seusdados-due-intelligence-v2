CREATE TABLE `reminder_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessLinkId` int NOT NULL,
	`organizationId` int NOT NULL,
	`thirdPartyId` int NOT NULL,
	`reminderNumber` int NOT NULL DEFAULT 1,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('sent','failed','skipped') NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	CONSTRAINT `reminder_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminder_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`daysAfterSent` int NOT NULL DEFAULT 7,
	`maxReminders` int NOT NULL DEFAULT 3,
	`reminderInterval` int NOT NULL DEFAULT 7,
	`lastProcessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminder_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_settings_organizationId_unique` UNIQUE(`organizationId`)
);
