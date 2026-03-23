DROP TABLE `task_reassignment_log`;--> statement-breakpoint
DROP TABLE `task_watchers`;--> statement-breakpoint
ALTER TABLE `action_plans` DROP COLUMN `moduleSource`;--> statement-breakpoint
ALTER TABLE `action_plans` DROP COLUMN `assigneeUserId`;