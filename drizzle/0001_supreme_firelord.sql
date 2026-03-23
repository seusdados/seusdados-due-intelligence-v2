CREATE TABLE `action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentType` enum('compliance','third_party') NOT NULL,
	`assessmentId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`status` enum('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`responsibleId` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `action_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`organizationId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`framework` enum('misto','sgd','ico','cnil') NOT NULL DEFAULT 'misto',
	`status` enum('rascunho','em_andamento','concluida','arquivada') NOT NULL DEFAULT 'rascunho',
	`overallScore` int,
	`maturityLevel` int,
	`riskScore` int,
	`totalQuestions` int DEFAULT 0,
	`answeredQuestions` int DEFAULT 0,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainId` int NOT NULL,
	`questionId` varchar(20) NOT NULL,
	`selectedLevel` int NOT NULL,
	`riskScore` int,
	`notes` text,
	`evidenceUrls` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`entityType` enum('organization','third_party','compliance_assessment','third_party_assessment','action_plan') NOT NULL,
	`entityId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int,
	`type` enum('assessment_completed','risk_critical','action_due','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`entityType` varchar(50),
	`entityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`tradeName` varchar(255),
	`cnpj` varchar(18),
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`logoUrl` text,
	`primaryColor` varchar(7) DEFAULT '#5f29cc',
	`secondaryColor` varchar(7) DEFAULT '#0ea5e9',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_cnpj_unique` UNIQUE(`cnpj`)
);
--> statement-breakpoint
CREATE TABLE `third_parties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`tradeName` varchar(255),
	`cnpj` varchar(18),
	`type` enum('fornecedor','parceiro','suboperador','outro') NOT NULL DEFAULT 'fornecedor',
	`category` varchar(100),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`address` text,
	`description` text,
	`riskLevel` enum('baixo','moderado','alto','critico'),
	`lastAssessmentDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `third_parties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `third_party_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`thirdPartyId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('rascunho','em_andamento','concluida','arquivada') NOT NULL DEFAULT 'rascunho',
	`overallRiskScore` int,
	`riskClassification` enum('baixo','moderado','alto','critico'),
	`totalQuestions` int DEFAULT 0,
	`answeredQuestions` int DEFAULT 0,
	`recommendation` text,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `third_party_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `third_party_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedLevel` int NOT NULL,
	`impactScore` int NOT NULL,
	`probabilityScore` int NOT NULL,
	`riskScore` int NOT NULL,
	`notes` text,
	`evidenceUrls` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `third_party_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`accessLevel` enum('viewer','editor','admin') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin_global','consultor','cliente') NOT NULL DEFAULT 'cliente';--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;