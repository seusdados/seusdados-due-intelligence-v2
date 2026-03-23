-- Tabela de auditoria de cláusulas LGPD
CREATE TABLE IF NOT EXISTS `clause_audit_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `analysisId` int NOT NULL,
  `clauseId` varchar(50) NOT NULL,
  `clauseAuditActionType` enum('generated','accepted','rejected','refined','edited','downloaded','copied') NOT NULL,
  `previousContent` text,
  `newContent` text,
  `refinementInstructions` text,
  `userId` int NOT NULL,
  `userName` varchar(255),
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `clause_audit_log_id` PRIMARY KEY(`id`)
);

-- Tabela de evidências de ações do plano
CREATE TABLE IF NOT EXISTS `action_plan_evidence` (
  `id` int AUTO_INCREMENT NOT NULL,
  `actionPlanId` int NOT NULL,
  `documentId` int NOT NULL,
  `description` text,
  `addedById` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `action_plan_evidence_id` PRIMARY KEY(`id`)
);

-- Tabela de cláusulas geradas por análise
CREATE TABLE IF NOT EXISTS `contract_analysis_clauses` (
  `id` int AUTO_INCREMENT NOT NULL,
  `analysisId` int NOT NULL,
  `clauseId` varchar(50) NOT NULL,
  `sequenceNumber` int NOT NULL,
  `title` varchar(500) NOT NULL,
  `content` text NOT NULL,
  `originalContent` text NOT NULL,
  `isAccepted` boolean NOT NULL DEFAULT true,
  `isApplicable` boolean NOT NULL DEFAULT true,
  `version` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `contract_analysis_clauses_id` PRIMARY KEY(`id`)
);

-- Índices para performance
CREATE INDEX `clause_audit_log_analysisId_idx` ON `clause_audit_log` (`analysisId`);
CREATE INDEX `clause_audit_log_userId_idx` ON `clause_audit_log` (`userId`);
CREATE INDEX `action_plan_evidence_actionPlanId_idx` ON `action_plan_evidence` (`actionPlanId`);
CREATE INDEX `contract_analysis_clauses_analysisId_idx` ON `contract_analysis_clauses` (`analysisId`);
