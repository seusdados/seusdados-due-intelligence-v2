CREATE TABLE `contract_analysis_outputs_manifest` (
	`analysisId` bigint NOT NULL,
	`organizationId` bigint NOT NULL,
	`mapCount` int NOT NULL DEFAULT 0,
	`checklistCount` int NOT NULL DEFAULT 0,
	`riskCount` int NOT NULL DEFAULT 0,
	`clauseCount` int NOT NULL DEFAULT 0,
	`actionPlanCount` int NOT NULL DEFAULT 0,
	`reportUrl` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`integrityHash` varchar(64),
	CONSTRAINT `contract_analysis_outputs_manifest_analysisId` PRIMARY KEY(`analysisId`)
);
--> statement-breakpoint
CREATE INDEX `contract_analysis_outputs_manifest_org_idx` ON `contract_analysis_outputs_manifest` (`organizationId`);