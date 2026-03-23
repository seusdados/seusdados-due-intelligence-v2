CREATE TABLE `task_reassignment_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`taskType` varchar(50) NOT NULL DEFAULT 'action_plan',
	`oldAssigneeUserId` int,
	`newAssigneeUserId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`organizationId` int NOT NULL,
	`message` text,
	`keepWatcher` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `task_watchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`addedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `action_plans` ADD `moduleSource` varchar(50);--> statement-breakpoint
ALTER TABLE `action_plans` ADD `assigneeUserId` int;--> statement-breakpoint
CREATE INDEX `idx_trl_task` ON `task_reassignment_log` (`taskId`);--> statement-breakpoint
CREATE INDEX `idx_trl_org` ON `task_reassignment_log` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_trl_actor` ON `task_reassignment_log` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `idx_tw_task` ON `task_watchers` (`taskId`);--> statement-breakpoint
CREATE INDEX `idx_tw_user` ON `task_watchers` (`userId`);