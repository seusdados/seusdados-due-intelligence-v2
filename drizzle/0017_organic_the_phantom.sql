CREATE TABLE `action_plan_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionPlanId` int NOT NULL,
	`documentId` int NOT NULL,
	`description` text,
	`addedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `action_plan_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `active_ticket_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`ticketType` enum('consultoria_geral','auditoria','treinamento','documentacao','duvida_juridica') NOT NULL,
	`category` enum('proativo','recomendacao','alerta','follow_up') NOT NULL,
	`frequency` enum('unica','semanal','quinzenal','mensal','trimestral') NOT NULL DEFAULT 'unica',
	`targetRecipients` json,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `active_ticket_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clause_audit_log` (
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
--> statement-breakpoint
CREATE TABLE `contract_analysis_clauses` (
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
--> statement-breakpoint
CREATE TABLE `global_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationType` varchar(50) NOT NULL,
	`notificationChannel` enum('in_app','email','both') NOT NULL DEFAULT 'in_app',
	`isEnabledByDefaultConsultor` boolean NOT NULL DEFAULT true,
	`allowConsultorOverride` boolean NOT NULL DEFAULT true,
	`daysBeforeDueDefault` int DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `global_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `global_notification_settings_notificationType_unique` UNIQUE(`notificationType`)
);
--> statement-breakpoint
CREATE TABLE `governanca_action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int,
	`agendaItemId` int,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assignedToUserId` int,
	`assignedToName` varchar(255),
	`dueDate` timestamp,
	`governancaPriority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`governancaActionStatus` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_agenda_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int NOT NULL,
	`createdById` int NOT NULL,
	`order` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`referenceDocuments` json,
	`governancaAgendaStatus` enum('nao_iniciado','em_discussao','encerrado') NOT NULL DEFAULT 'nao_iniciado',
	`decisionSummary` text,
	`llmSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_agenda_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_controls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`programId` int NOT NULL,
	`createdById` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`governancaControlCategory` enum('governanca','processos','tecnologia','pessoas','compliance') NOT NULL,
	`label` varchar(255) NOT NULL,
	`isImplemented` boolean NOT NULL DEFAULT false,
	`implementedAt` timestamp,
	`evidenceDocumentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_controls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_cppd_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`year` int NOT NULL,
	`governancaProgramType` enum('ano1','em_curso') NOT NULL,
	`cppdRegime` enum('quinzenal','mensal','bimestral') NOT NULL,
	`dayOfWeek` enum('domingo','segunda','terca','quarta','quinta','sexta','sabado') NOT NULL,
	`time` varchar(5) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`governancaMeetingProvider` enum('teams','meet','outlook','google','outro') NOT NULL DEFAULT 'teams',
	`defaultMeetingUrl` varchar(255),
	`governancaCppdStatus` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_cppd_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_cppd_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`cppdId` int NOT NULL,
	`createdById` int NOT NULL,
	`userId` int NOT NULL,
	`nameSnapshot` varchar(255) NOT NULL,
	`emailSnapshot` varchar(255) NOT NULL,
	`governancaMemberRole` enum('sponsor','dpo','juridico','ti','rh','seguranca_da_informacao','processos','comercial_marketing','operacoes','outro') NOT NULL,
	`isVoting` boolean NOT NULL DEFAULT true,
	`isCoordinator` boolean NOT NULL DEFAULT false,
	`isSecretary` boolean NOT NULL DEFAULT false,
	`isDpo` boolean NOT NULL DEFAULT false,
	`governancaMemberStatus` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`nominationTermUrl` text,
	`confidentialityTermUrl` text,
	`regimentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_cppd_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_meeting_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int NOT NULL,
	`createdById` int NOT NULL,
	`userId` int NOT NULL,
	`nameSnapshot` varchar(255) NOT NULL,
	`emailSnapshot` varchar(255) NOT NULL,
	`governancaParticipantRole` enum('membro','convidado','consultor','secretario','presidente') NOT NULL,
	`governancaAttendanceStatus` enum('nao_confirmado','presente','ausente','justificado') NOT NULL DEFAULT 'nao_confirmado',
	`joinTime` timestamp,
	`leaveTime` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_meeting_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`cppdId` int NOT NULL,
	`programId` int,
	`createdById` int NOT NULL,
	`year` int NOT NULL,
	`sequence` int NOT NULL,
	`date` timestamp NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 90,
	`governancaMeetingStatus` enum('agendada','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'agendada',
	`location` varchar(255),
	`governancaMeetingProvider` enum('teams','meet','outlook','google','outro') NOT NULL DEFAULT 'teams',
	`meetingUrl` text,
	`calendarEventId` varchar(255),
	`agendaTitle` varchar(255) NOT NULL,
	`agendaSummary` text,
	`agendaTemplateCode` varchar(50),
	`recordingUrl` text,
	`transcript` text,
	`minutesPdfUrl` text,
	`governancaMinutesStatus` enum('nao_gerada','em_validacao','em_assinatura','assinada') NOT NULL DEFAULT 'nao_gerada',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_program_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`programId` int NOT NULL,
	`phaseId` int NOT NULL,
	`createdById` int NOT NULL,
	`month` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`evidenceDocumentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_program_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_program_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`programId` int NOT NULL,
	`createdById` int NOT NULL,
	`phaseNumber` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`theme` varchar(255),
	`startMonth` int NOT NULL,
	`endMonth` int NOT NULL,
	`quarter` varchar(10),
	`governancaPhaseStatus` enum('nao_iniciado','em_andamento','concluido') NOT NULL DEFAULT 'nao_iniciado',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_program_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`year` int NOT NULL,
	`governancaProgramType` enum('ano1','em_curso') NOT NULL,
	`governancaProgramStatus` enum('planejado','em_execucao','concluido','pausado') NOT NULL DEFAULT 'planejado',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governanca_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meudpo_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`slaCritica` int NOT NULL DEFAULT 4,
	`slaAlta` int NOT NULL DEFAULT 8,
	`slaMedia` int NOT NULL DEFAULT 24,
	`slaBaixa` int NOT NULL DEFAULT 72,
	`notifyOnCreate` boolean NOT NULL DEFAULT true,
	`notifyOnUpdate` boolean NOT NULL DEFAULT true,
	`notifyOnComment` boolean NOT NULL DEFAULT true,
	`notifyOnResolve` boolean NOT NULL DEFAULT true,
	`notifySlaWarning` boolean NOT NULL DEFAULT true,
	`slaWarningThreshold` int NOT NULL DEFAULT 80,
	`autoReportEnabled` boolean NOT NULL DEFAULT false,
	`autoReportFrequency` enum('diario','semanal','quinzenal','mensal') NOT NULL DEFAULT 'mensal',
	`reportRecipients` json,
	`customCategories` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meudpo_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `meudpo_settings_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` varchar(50) NOT NULL,
	`notificationChannel` enum('in_app','email','both') NOT NULL DEFAULT 'in_app',
	`isEnabled` boolean NOT NULL DEFAULT true,
	`daysBeforeDue` int DEFAULT 3,
	`canUserModify` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`notificationType` varchar(50) NOT NULL,
	`notificationChannel` enum('in_app','email','both') NOT NULL DEFAULT 'email',
	`isEnabledByDefault` boolean NOT NULL DEFAULT true,
	`allowUserOverride` boolean NOT NULL DEFAULT false,
	`daysBeforeDue` int DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_notification_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `response_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`ticketType` varchar(50),
	`isGlobal` boolean NOT NULL DEFAULT false,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `response_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rot_operations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`department` varchar(100),
	`titularCategory` varchar(100) NOT NULL,
	`dataCategories` json NOT NULL,
	`purpose` text NOT NULL,
	`legalBase` varchar(255) NOT NULL,
	`requiresConsent` boolean NOT NULL,
	`alternativeBases` json DEFAULT ('[]'),
	`risksIfNoConsent` json DEFAULT ('[]'),
	`justification` text,
	`aiAnalysis` json,
	`aiGeneratedAt` timestamp,
	`popFileKey` varchar(255),
	`rotFileKey` varchar(255),
	`rot_op_status` enum('rascunho','em_revisao','aprovado','arquivado') NOT NULL DEFAULT 'rascunho',
	`approvedById` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rot_operations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rot_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rotId` int NOT NULL,
	`assigneeId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueDate` timestamp,
	`rot_task_priority` enum('baixa','media','alta','critica') NOT NULL,
	`completed` boolean DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rot_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_template_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`scheduledBy` int NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`endDate` timestamp,
	`status` enum('scheduled','running','completed','failed','cancelled') NOT NULL DEFAULT 'scheduled',
	`executedAt` timestamp,
	`results` json,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_template_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`category` enum('before','during','after') NOT NULL,
	`description` text NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`responsible` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulation_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`phase` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`decisionMaker` varchar(255) NOT NULL,
	`decisionType` enum('operational','strategic','communication') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`phase` varchar(50) NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`severity` enum('baixa','media','alta','critica') NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`participantId` int NOT NULL,
	`participantRole` varchar(100) NOT NULL,
	`clarityScore` int NOT NULL,
	`communicationScore` int NOT NULL,
	`toolsScore` int NOT NULL,
	`strengths` text,
	`weaknesses` text,
	`suggestions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_kpis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`kpiId` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`description` text,
	`target` int,
	`thresholdWarning` int,
	`thresholdCritical` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulation_kpis_id` PRIMARY KEY(`id`),
	CONSTRAINT `simulation_kpis_kpiId_unique` UNIQUE(`kpiId`)
);
--> statement-breakpoint
CREATE TABLE `simulation_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipoIncidente` varchar(100) NOT NULL,
	`descricao` text NOT NULL,
	`areasEnvolvidas` json NOT NULL,
	`sistemasAfetados` json NOT NULL,
	`objetivos` json NOT NULL,
	`papeisChave` json NOT NULL,
	`criteriosSucesso` json NOT NULL,
	`trimestre` varchar(20),
	`isTemplate` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulation_scenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_stakeholders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(100) NOT NULL,
	`department` varchar(100),
	`email` varchar(255),
	`phone` varchar(50),
	`notified` boolean NOT NULL DEFAULT false,
	`notifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulation_stakeholders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`createdById` int NOT NULL,
	`scenarioName` varchar(255) NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`status` enum('planejada','em_andamento','pausada','concluida','cancelada') NOT NULL DEFAULT 'planejada',
	`phaseTimings` json NOT NULL,
	`kpiValues` json NOT NULL,
	`playbookAdherence` int DEFAULT 0,
	`recordsCompleteness` int DEFAULT 0,
	`participants` json,
	`quarter` varchar(20),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sla_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`ticketId` int NOT NULL,
	`firstResponseTime` int,
	`resolutionTime` int,
	`expectedFirstResponse` int NOT NULL,
	`expectedResolution` int NOT NULL,
	`firstResponseMet` boolean,
	`resolutionMet` boolean,
	`period` varchar(7) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sla_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`organizationId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`storageUrl` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`eventType` enum('deadline','reminder','meeting','followup') NOT NULL DEFAULT 'deadline',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`externalCalendarType` enum('google','outlook'),
	`externalEventId` varchar(255),
	`reminderMinutes` int DEFAULT 30,
	`reminderSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ticket_calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`organizationId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorRole` enum('cliente','consultor','advogado','dpo','admin_global'),
	`content` text NOT NULL,
	`isInternal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_escalations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`fromUserId` int,
	`toUserId` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`escalation_type` enum('sla_warning','sla_breach','manual','priority_change') NOT NULL,
	`previousPriority` varchar(20),
	`newPriority` varchar(20),
	`notifiedAt` timestamp,
	`acknowledgedAt` timestamp,
	`acknowledgedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_escalations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_tag_associations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticket_tag_associations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6366f1',
	`description` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ticket_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`assignedToId` int,
	`clientId` int,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`ticketType` enum('solicitacao_titular','incidente_seguranca','duvida_juridica','consultoria_geral','auditoria','treinamento','documentacao') NOT NULL,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`status` enum('novo','em_analise','aguardando_cliente','aguardando_terceiro','resolvido','cancelado') NOT NULL DEFAULT 'novo',
	`slaLevel` enum('padrao','prioritario','urgente') NOT NULL DEFAULT 'padrao',
	`deadline` timestamp,
	`resolution` text,
	`legalBasis` varchar(255),
	`applicableArticles` json,
	`sourceContext` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contract_analysis_history` MODIFY COLUMN `historyActionType` enum('created','analysis_started','analysis_completed','analysis_error','refinement_requested','refinement_completed','reviewed','approved','rejected','exported','xai_analyzed','xai_clauses_generated','xai_action_plan_generated','xai_alert_contested','xai_report_exported') NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `notificationType` enum('assessment_completed','risk_critical','action_due','action_overdue','document_added','assessment_responded','task_assigned','task_due_reminder','contract_analysis_complete','invitation_received','system','ticket_created','ticket_updated','ticket_comment','ticket_resolved','ticket_assigned','sla_warning','sla_breach','report_ready') NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `link` varchar(500);--> statement-breakpoint
ALTER TABLE `notifications` ADD `readAt` timestamp;--> statement-breakpoint
ALTER TABLE `notifications` ADD `sentViaEmail` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `emailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `notifications` DROP COLUMN `type`;