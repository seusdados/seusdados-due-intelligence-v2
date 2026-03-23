CREATE TABLE `governanca_atividade_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesOrganizacaoId` int NOT NULL,
	`organizationId` int NOT NULL,
	`order` int NOT NULL,
	`description` text NOT NULL,
	`atividadeStatus` enum('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`assignedToId` int,
	`assignedToName` varchar(255),
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_atividade_organizacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_entregavel_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesOrganizacaoId` int NOT NULL,
	`organizationId` int NOT NULL,
	`order` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`entregavelStatus` enum('pendente','em_elaboracao','em_revisao','aprovado','arquivado') NOT NULL DEFAULT 'pendente',
	`assignedToId` int,
	`assignedToName` varchar(255),
	`documentId` int,
	`documentUrl` text,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_entregavel_organizacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_mes_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planoOrganizacaoId` int NOT NULL,
	`organizationId` int NOT NULL,
	`mesTemplateId` int NOT NULL,
	`monthNumber` int NOT NULL,
	`scheduledStartDate` timestamp,
	`scheduledEndDate` timestamp,
	`actualStartDate` timestamp,
	`actualEndDate` timestamp,
	`governancaPhaseStatus` enum('nao_iniciado','em_andamento','concluido') NOT NULL DEFAULT 'nao_iniciado',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_mes_organizacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_mes_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planoAnualTemplateId` int NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`monthNumber` int NOT NULL,
	`macroBlock` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`theme` varchar(255) NOT NULL,
	`activities` json NOT NULL,
	`deliverables` json NOT NULL,
	`blockColor` varchar(7) DEFAULT '#5f29cc',
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_mes_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `governanca_mes_templates_templateKey_unique` UNIQUE(`templateKey`)
);
--> statement-breakpoint
CREATE TABLE `governanca_plano_anual_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateId` int NOT NULL,
	`year` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`governancaProgramStatus` enum('planejado','em_execucao','concluido','pausado') NOT NULL DEFAULT 'planejado',
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_plano_anual_organizacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_plano_anual_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`governancaProgramType` enum('ano1','em_curso') NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`totalMonths` int NOT NULL DEFAULT 10,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_plano_anual_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `governanca_plano_anual_templates_templateKey_unique` UNIQUE(`templateKey`)
);
