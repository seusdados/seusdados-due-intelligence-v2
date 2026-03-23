CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`activityType` enum('avaliacao_criada','avaliacao_concluida','avaliacao_atribuida','terceiro_cadastrado','terceiro_avaliado','contrato_enviado','contrato_analisado','contrato_aprovado','ticket_criado','ticket_respondido','ticket_resolvido','plano_acao_criado','plano_acao_concluido','tarefa_concluida','documento_enviado','documento_compartilhado','incidente_registrado','incidente_atualizado','reuniao_agendada','reuniao_realizada','mapeamento_criado','mapeamento_concluido','relatorio_gerado','relatorio_exportado','usuario_convidado','link_enviado','dpia_criada','dpia_concluida') NOT NULL,
	`module` enum('conformidade','due_diligence','contratos','meudpo','incidentes','governanca','mapeamento','ged','plano_acao','dpia','sistema') NOT NULL,
	`description` varchar(500) NOT NULL,
	`entityType` varchar(50),
	`entityId` int,
	`entityName` varchar(255),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `activity_log_org_idx` ON `activity_log` (`organizationId`);--> statement-breakpoint
CREATE INDEX `activity_log_user_idx` ON `activity_log` (`userId`);--> statement-breakpoint
CREATE INDEX `activity_log_type_idx` ON `activity_log` (`activityType`);--> statement-breakpoint
CREATE INDEX `activity_log_module_idx` ON `activity_log` (`module`);--> statement-breakpoint
CREATE INDEX `activity_log_created_idx` ON `activity_log` (`createdAt`);