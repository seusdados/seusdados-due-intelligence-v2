ALTER TABLE `contract_analyses` ADD `stage` varchar(50) DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `stageProgress` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `reportUrl` text;