CREATE TABLE `action_plan_progress_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionPlanId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorName` varchar(255) NOT NULL,
	`text` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `progress_notes_action_idx` ON `action_plan_progress_notes` (`actionPlanId`);--> statement-breakpoint
CREATE INDEX `progress_notes_author_idx` ON `action_plan_progress_notes` (`authorId`);