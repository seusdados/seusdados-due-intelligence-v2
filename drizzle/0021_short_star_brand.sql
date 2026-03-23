ALTER TABLE `contract_analyses` MODIFY COLUMN `contractAnalysisStatus` enum('queued','pending','analyzing','completed','reviewed','approved','rejected','error','canceled') NOT NULL DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `status` varchar(50);--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `linkedRipdId` int;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `lockedByRipd` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `startedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `finishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `attempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `maxAttempts` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `lastHeartbeatAt` timestamp;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `errorCode` varchar(50);--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `errorMessage` text;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `canceledAt` timestamp;--> statement-breakpoint
ALTER TABLE `contract_analyses` ADD `resultVersion` int DEFAULT 1 NOT NULL;