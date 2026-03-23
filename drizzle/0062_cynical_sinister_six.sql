CREATE TABLE `action_plan_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionPlanId` int NOT NULL,
	`changedById` int NOT NULL,
	`changeType` enum('atribuicao','reatribuicao','aceite','recusa','status','prazo','edicao') NOT NULL,
	`previousValue` text,
	`newValue` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `action_plan_history_action_idx` ON `action_plan_history` (`actionPlanId`);--> statement-breakpoint
CREATE INDEX `action_plan_history_user_idx` ON `action_plan_history` (`changedById`);