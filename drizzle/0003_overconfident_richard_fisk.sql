CREATE TABLE `access_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`thirdPartyId` int NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentId` int,
	`type` enum('due_diligence','conformidade') NOT NULL DEFAULT 'due_diligence',
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_links_token_unique` UNIQUE(`token`)
);
