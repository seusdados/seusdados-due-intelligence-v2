ALTER TABLE `organizations` ADD `segment` varchar(100);--> statement-breakpoint
ALTER TABLE `organizations` ADD `businessType` varchar(100);--> statement-breakpoint
ALTER TABLE `organizations` ADD `units` int;--> statement-breakpoint
ALTER TABLE `organizations` ADD `employeesRange` varchar(50);--> statement-breakpoint
ALTER TABLE `organizations` ADD `hasDpo` tinyint;--> statement-breakpoint
ALTER TABLE `organizations` ADD `dpoName` varchar(255);--> statement-breakpoint
ALTER TABLE `organizations` ADD `dpoEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `organizations` ADD `sponsorUserId` int;