CREATE TABLE `user_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`token` varchar(100) NOT NULL,
	`role` enum('admin','consultor','cliente') NOT NULL DEFAULT 'cliente',
	`organizationId` int,
	`invitedById` int NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`emailSentAt` timestamp,
	`emailSentCount` int NOT NULL DEFAULT 0,
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invites_token_unique` UNIQUE(`token`)
);
