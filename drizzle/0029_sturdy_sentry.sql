CREATE TABLE `text_version_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('rot','pop','justificativa','base_legal','analise_risco','recomendacoes') NOT NULL,
	`entityId` int NOT NULL,
	`organizationId` int NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`previousContent` text,
	`version` int NOT NULL DEFAULT 1,
	`changeReason` text,
	`changeType` enum('criacao','edicao_manual','geracao_ia','revisao','aprovacao') NOT NULL DEFAULT 'criacao',
	`createdById` int NOT NULL,
	`createdByName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `text_version_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tvh_entity_idx` ON `text_version_history` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `tvh_org_idx` ON `text_version_history` (`organizationId`);--> statement-breakpoint
CREATE INDEX `tvh_field_idx` ON `text_version_history` (`fieldName`);--> statement-breakpoint
CREATE INDEX `tvh_created_idx` ON `text_version_history` (`createdAt`);