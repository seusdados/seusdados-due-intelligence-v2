CREATE TABLE `third_party_access_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`thirdPartyId` int NOT NULL,
	`assessmentId` int,
	`token` varchar(64) NOT NULL,
	`status` enum('ativo','expirado','usado','cancelado') NOT NULL DEFAULT 'ativo',
	`expiresAt` timestamp,
	`usedAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `third_party_access_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `third_party_access_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `third_parties` ADD `contactWhatsapp` varchar(20);--> statement-breakpoint
ALTER TABLE `third_parties` ADD `managerArea` varchar(255);--> statement-breakpoint
ALTER TABLE `third_parties` ADD `contractType` varchar(100);