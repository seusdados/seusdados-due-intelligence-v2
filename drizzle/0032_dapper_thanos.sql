CREATE TABLE `custom_taxonomy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`kind` enum('segment','business_type','area','process') NOT NULL,
	`parent_code` varchar(100),
	`code` varchar(100) NOT NULL,
	`label` varchar(255) NOT NULL,
	`created_by_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `custom_taxonomy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ct_org_idx` ON `custom_taxonomy` (`organization_id`);--> statement-breakpoint
CREATE INDEX `ct_kind_idx` ON `custom_taxonomy` (`kind`);