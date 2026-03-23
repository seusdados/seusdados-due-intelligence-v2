CREATE TABLE `mapeamento_delegations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`area_id` int NOT NULL,
	`process_id` int NOT NULL,
	`delegated_by` int NOT NULL,
	`delegated_to` int NOT NULL,
	`status` enum('ativa','concluida','revogada') NOT NULL DEFAULT 'ativa',
	`notes` text,
	`delegated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completed_at` timestamp,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`organization_id` int NOT NULL,
	`profile_type` varchar(50) NOT NULL,
	`area_id` int,
	`assigned_by` int,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `md_org_idx` ON `mapeamento_delegations` (`organization_id`);--> statement-breakpoint
CREATE INDEX `md_area_idx` ON `mapeamento_delegations` (`area_id`);--> statement-breakpoint
CREATE INDEX `md_process_idx` ON `mapeamento_delegations` (`process_id`);--> statement-breakpoint
CREATE INDEX `md_delegated_by_idx` ON `mapeamento_delegations` (`delegated_by`);--> statement-breakpoint
CREATE INDEX `md_delegated_to_idx` ON `mapeamento_delegations` (`delegated_to`);--> statement-breakpoint
CREATE INDEX `md_status_idx` ON `mapeamento_delegations` (`status`);--> statement-breakpoint
CREATE INDEX `up_user_idx` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `up_org_idx` ON `user_profiles` (`organization_id`);--> statement-breakpoint
CREATE INDEX `up_profile_idx` ON `user_profiles` (`profile_type`);--> statement-breakpoint
CREATE INDEX `up_area_idx` ON `user_profiles` (`area_id`);--> statement-breakpoint
CREATE INDEX `up_user_org_idx` ON `user_profiles` (`user_id`,`organization_id`);