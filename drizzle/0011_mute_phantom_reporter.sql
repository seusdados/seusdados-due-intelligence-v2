CREATE TABLE `assessment_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentType` enum('conformidade','due_diligence') NOT NULL,
	`assessmentId` int NOT NULL,
	`documentId` int NOT NULL,
	`category` enum('evidencia_conformidade','documento_suporte','relatorio_auditoria','politica_procedimento','contrato','termo_responsabilidade','outro') NOT NULL DEFAULT 'documento_suporte',
	`description` text,
	`linkedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_documents_id` PRIMARY KEY(`id`)
);
