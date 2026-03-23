CREATE TABLE `lgpd_clause_template_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`organizationId` int,
	`previousContent` text NOT NULL,
	`newContent` text NOT NULL,
	`changedBy` int NOT NULL,
	`changeReason` text,
	`version` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lgpd_clause_template_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lgpd_clause_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`templateId` varchar(50) NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateDescription` text,
	`content` text NOT NULL,
	`variables` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lgpd_clause_templates_id` PRIMARY KEY(`id`)
);
