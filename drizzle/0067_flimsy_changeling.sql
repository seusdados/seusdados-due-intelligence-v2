ALTER TABLE `action_plans` ADD `sourceQuestionKey` varchar(50);--> statement-breakpoint
ALTER TABLE `action_plans` ADD `sourceQuestionText` text;--> statement-breakpoint
ALTER TABLE `action_plans` ADD `sourceDomainName` varchar(255);--> statement-breakpoint
ALTER TABLE `action_plans` ADD `sourceSelectedLevel` int;--> statement-breakpoint
ALTER TABLE `action_plans` ADD `sourceSelectedAnswer` text;