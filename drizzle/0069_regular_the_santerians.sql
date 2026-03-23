CREATE TABLE `action_plan_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionPlanId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`userRole` varchar(50) NOT NULL,
	`text` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `apo_actionPlanId_idx` ON `action_plan_observations` (`actionPlanId`);--> statement-breakpoint
CREATE INDEX `apo_userId_idx` ON `action_plan_observations` (`userId`);